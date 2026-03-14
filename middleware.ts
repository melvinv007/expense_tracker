import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const auth = req.cookies.get('auth')?.value;
  if (auth === process.env.SITE_PASSWORD) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (pathname === '/login') return NextResponse.next();

  return NextResponse.redirect(new URL('/login', req.url));
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|api/login).*)'],
};