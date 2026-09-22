import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'hrms_session';
const JWT_SECRET_STRING = process.env.JWT_SECRET || 'fallback-secret-key-for-development-only-32bytes';

function getJwtSecretKey() {
  return new TextEncoder().encode(JWT_SECRET_STRING);
}

// Protected UI routes needing authentication
const protectedRoutes = [
  '/dashboard',
  '/employees',
  '/attendance',
  '/leave',
  '/profile',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;

  let isAuthenticated = false;
  if (token) {
    try {
      await jwtVerify(token, getJwtSecretKey(), {
        algorithms: ['HS256'],
      });
      isAuthenticated = true;
    } catch {
      isAuthenticated = false;
    }
  }

  // 1. If user is authenticated and visiting /login -> redirect to /dashboard
  if (pathname === '/login' && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 2. If user is unauthenticated and visiting a protected route -> redirect to /login
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
