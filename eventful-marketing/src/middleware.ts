import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side route protection via cookie validation.
 *
 * How it works:
 *  - On login/register the auth-context sets `refresh_token` as a cookie (30d TTL).
 *  - This middleware reads that cookie before the page renders.
 *  - If a user tries to access /dashboard/* without the cookie → redirect to /login.
 *  - If an already-authenticated user hits /login or /signup → redirect to /dashboard.
 *
 * The refresh_token cookie has a 30-day window, so the middleware stays valid even
 * after the 15-minute access token expires (the client refreshes the access token
 * transparently via useApiFetch → refreshAccessToken).
 */

const PROTECTED = ['/dashboard'];
const AUTH_ROUTES = ['/login', '/signup', '/register', '/become-creator'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const refreshToken = request.cookies.get('refresh_token')?.value;

  // Block unauthenticated access to /dashboard and sub-routes
  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  if (isProtected && !refreshToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  const isAuthPage = AUTH_ROUTES.some((p) => pathname.startsWith(p));
  if (isAuthPage && refreshToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
    '/signup',
    '/register',
    '/become-creator',
  ],
};
