import { NextResponse } from 'next/server';

const JWT_COOKIE = 'jwt';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(JWT_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  return res;
}
