import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

function jwtSecretBytes(): Uint8Array | null {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) return null;
  return new TextEncoder().encode(s);
}

export async function proxy(request: NextRequest) {
  const token = request.cookies.get('jwt')?.value;
  const secret = jwtSecretBytes();

  if (!token || !secret) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  try {
    await jwtVerify(token, secret);
  } catch {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
