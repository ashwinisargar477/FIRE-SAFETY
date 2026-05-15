import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

import { getJwtSecretBytes } from '@/lib/jwtSecret';

type JwtPayload = {
  empCode?: string;
  empName?: string;
  empEmail?: string;
  roles?: string[];
};

export async function GET() {
  const jar = await cookies();
  const token = jar.get('jwt')?.value;
  if (!token) {
    return NextResponse.json({ ok: false, authenticated: false }, { status: 401 });
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecretBytes());
    const p = payload as JwtPayload;
    const username = String(p.empCode ?? '');
    return NextResponse.json({
      ok: true,
      authenticated: true,
      user: {
        username,
        displayName: String(p.empName ?? username),
        email: String(p.empEmail ?? ''),
        roles: Array.isArray(p.roles) ? p.roles.map(String) : [],
      },
    });
  } catch {
    return NextResponse.json({ ok: false, authenticated: false }, { status: 401 });
  }
}
