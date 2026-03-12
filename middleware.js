import { NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/verify-otp', '/register', '/download', '/forgot-password', '/reset-password'];

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Allow public routes and Next.js internals
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isStaticAsset = /\.[^/]+$/.test(pathname);
  const isNextInternal =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api');

  if (isPublic || isStaticAsset || isNextInternal) return NextResponse.next();

  // Check for JWT cookie
  const token = request.cookies.get('nfs_token')?.value;
  if (!token) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\..*).*)'],
};

