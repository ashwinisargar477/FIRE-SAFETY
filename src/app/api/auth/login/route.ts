import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';

import { getJwtSecretBytes } from '@/lib/jwtSecret';
import { ldapConnectAndBind, normalizeLdapUsername } from '@/lib/ldap';

const JWT_COOKIE = 'jwt';
const TOKEN_TTL_SEC = 60 * 60;

function corporateEmail(username: string): string {
  const domain = process.env.LDAP_EMAIL_DOMAIN?.trim() || 'nuvoco.com';
  return `${username.toLowerCase()}@${domain}`;
}

function displayNameFromUsername(username: string): string {
  const noDomain = username.includes('\\')
    ? username.slice(username.lastIndexOf('\\') + 1)
    : username.includes('@')
      ? username.slice(0, username.indexOf('@'))
      : username;
  const parts = noDomain.split(/[._-]+/).filter(Boolean);
  if (parts.length === 0) return username;
  return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
}

function configResponse(): NextResponse | null {
  try {
    getJwtSecretBytes();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error:
          'JWT_SECRET is missing or too short: add JWT_SECRET to .env.local (at least 16 characters). Restart npm run dev.',
      },
      { status: 503 }
    );
  }
  return null;
}

export async function POST(req: Request) {
  const blocked = configResponse();
  if (blocked) return blocked;

  let body: { username?: string; password?: string };
  try {
    body = (await req.json()) as { username?: string; password?: string };
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const rawUser = body.username;
  const password = body.password;
  if (typeof rawUser !== 'string' || typeof password !== 'string') {
    return NextResponse.json({ ok: false, error: 'Username and password required' }, { status: 400 });
  }

  try {
    await ldapConnectAndBind(rawUser, password);
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid username or password.' },
      { status: 401 }
    );
  }

  const normalized = normalizeLdapUsername(rawUser);
  const empEmail = corporateEmail(normalized);
  const empName = displayNameFromUsername(rawUser.trim());
  const roles = ['User'];

  let token: string;
  try {
    token = await new SignJWT({
      empCode: normalized,
      empName,
      empEmail,
      roles,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${TOKEN_TTL_SEC}s`)
      .sign(getJwtSecretBytes());
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Session signing failed. Check JWT_SECRET on the server.' },
      { status: 500 }
    );
  }

  const res = NextResponse.json({
    ok: true,
    user: {
      username: normalized,
      displayName: empName,
      email: empEmail,
      roles,
    },
  });

  res.cookies.set(JWT_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: TOKEN_TTL_SEC,
  });

  return res;
}
