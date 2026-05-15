import 'server-only';

import ldap from 'ldapjs';

/** Matches corporate LDAP entry point (override with LDAP_URL). */
export const DEFAULT_LDAP_URL = 'ldap://nuvoco.net:389';

/** UPN suffix used for bind, e.g. `user@nuvoco.net` (override with LDAP_BIND_DOMAIN). */
export const DEFAULT_BIND_DOMAIN = 'nuvoco.net';

export function getEffectiveLdapUrl(): string {
  return process.env.LDAP_URL?.trim() || DEFAULT_LDAP_URL;
}

/**
 * Normalizes common corporate login inputs: `DOMAIN\\user`, `user@domain`, or plain `user`.
 */
export function normalizeLdapUsername(raw: string): string {
  let s = raw.trim();
  if (!s) return '';

  const at = s.indexOf('@');
  if (at > 0) {
    s = s.slice(0, at);
  }

  const bs = s.lastIndexOf('\\');
  if (bs >= 0) {
    s = s.slice(bs + 1);
  }

  return s;
}

function bindUpnForUser(username: string): string {
  const domain = process.env.LDAP_BIND_DOMAIN?.trim() || DEFAULT_BIND_DOMAIN;
  return `${username}@${domain}`;
}

function clientErrorMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    const o = err as Record<string, unknown>;
    if (typeof o.lde_message === 'string' && o.lde_message) return o.lde_message;
    if (typeof o.message === 'string' && o.message) return o.message;
  }
  if (err instanceof Error) return err.message;
  return 'Please check network or credentials';
}

/**
 * Binds to LDAP (same flow as your `ldapConnectAndBind` with ldapjs):
 * `ldap://nuvoco.net:389` and bind DN `${username}@nuvoco.net` by default.
 *
 * Override with env: `LDAP_URL`, `LDAP_BIND_DOMAIN` (e.g. `nuvoco.net`).
 */
export async function ldapConnectAndBind(
  rawUsername: string,
  password: string
): Promise<void> {
  const username = normalizeLdapUsername(rawUsername);
  if (!username || !password) {
    throw new Error('Username and password are required');
  }

  const ldapUrl = getEffectiveLdapUrl();
  const bindDN = bindUpnForUser(username);
  const bindCredentials = password;

  await new Promise<void>((resolve, reject) => {
    const client = ldap.createClient({
      url: ldapUrl,
      timeout: 20000,
      connectTimeout: 15000,
    });

    client.bind(bindDN, bindCredentials, (err) => {
      if (err) {
        try {
          client.destroy();
        } catch {
          /* ignore */
        }
        reject(new Error(clientErrorMessage(err)));
        return;
      }

      client.unbind((unbindErr) => {
        if (unbindErr) {
          try {
            client.destroy();
          } catch {
            /* ignore */
          }
          reject(new Error(clientErrorMessage(unbindErr)));
          return;
        }
        resolve();
      });
    });
  });
}
