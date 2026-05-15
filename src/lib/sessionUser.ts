/**
 * Client session user stored under `nuvoco-current-user` — username + display only.
 * Work email is derived in code (never persisted in localStorage).
 */
export type StoredSessionUser = {
  username: string;
  displayName?: string;
  /** Set after LDAP login — preferred for issue reporter email when present. */
  email?: string;
};

/** Known login identities → canonical email for UI / reporting (not stored client-side). */
const SESSION_EMAIL_BY_USERNAME: Record<string, string> = {
  'aditya.singh01': 'aditya.singh01@nuvoco.com',
  ashwinisargar18: 'ashwinisargar18@gmail.com',
  'nuvoco\\ashwini.sargar': 'ashwinisargar18@gmail.com',
  'ashwini.sargar': 'ashwinisargar18@gmail.com',
  'ashwini sargar': 'ashwinisargar18@gmail.com',
};

export function normalizeSessionUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Returns work email for a stored username, or null if unknown. */
export function resolveSessionEmail(username: string | undefined): string | null {
  if (!username) return null;
  return SESSION_EMAIL_BY_USERNAME[normalizeSessionUsername(username)] ?? null;
}

/** Parsed `nuvoco-current-user` JSON (legacy sessions may still include `email`). */
export type ParsedSessionUser = StoredSessionUser & {
  email?: string;
};

export function parseSessionUserJson(raw: string | null): ParsedSessionUser | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ParsedSessionUser;
  } catch {
    return null;
  }
}

/**
 * Email for issue reports: derived from username, else legacy stored email (old sessions only).
 */
export function resolveReporterEmail(session: ParsedSessionUser | null | undefined): string | null {
  if (!session) return null;
  const fromLogin = session.email?.trim();
  if (fromLogin?.includes('@')) return fromLogin;
  return resolveSessionEmail(session.username);
}

export type IssueReporterPayload = {
  reportedBy: string;
  reporterUsername?: string;
  reporterDisplayName?: string;
  reporterEmail: string | null;
};

const FALLBACK_REPORTER = 'Unknown user';

/** Fields to POST with empty-cylinder (and similar) issue APIs. */
export function buildIssueReporterPayload(raw: string | null, fallback = FALLBACK_REPORTER): IssueReporterPayload {
  const s = parseSessionUserJson(raw);
  const display = s?.displayName?.trim() || s?.username?.trim() || '';
  const email = resolveReporterEmail(s);
  const reportedBy =
    display && email
      ? `${display} (${email})`
      : email
        ? email
        : display || fallback;
  return {
    reportedBy,
    reporterUsername: s?.username,
    reporterDisplayName: s?.displayName,
    reporterEmail: email,
  };
}
