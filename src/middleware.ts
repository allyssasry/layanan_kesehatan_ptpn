// src/middleware.ts - Role-Based Access Control (RBAC) Route Protection
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Baca user role dari cookie
  const userRole = request.cookies.get('ptpn_user_role')?.value;

  // 1. Rute Publik (Login / Register)
  const publicPaths = ['/login', '/register'];
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    if (userRole) {
      // Jika sudah login, redirect otomatis ke dashboard sesuai role
      const dashMap: Record<string, string> = {
        admin: '/admin/dashboard',
        klinik: '/klinik/dashboard',
        karyawan: '/employee/dashboard',
      };
      return NextResponse.redirect(new URL(dashMap[userRole] || '/login', request.url));
    }
    return NextResponse.next();
  }

  // 2. Rute Root
  if (pathname === '/') {
    if (userRole) {
      const dashMap: Record<string, string> = {
        admin: '/admin/dashboard',
        klinik: '/klinik/dashboard',
        karyawan: '/employee/dashboard',
      };
      return NextResponse.redirect(new URL(dashMap[userRole] || '/login', request.url));
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 3. Rute Terproteksi - Wajib Login
  const protectedPrefixes = ['/admin', '/klinik', '/employee', '/settings', '/notifications'];
  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p));

  if (isProtected && !userRole) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 4. RBAC Guard per Role
  if (pathname.startsWith('/admin') && userRole !== 'admin') {
    const dash = userRole === 'klinik' ? '/klinik/dashboard' : '/employee/dashboard';
    return NextResponse.redirect(new URL(dash, request.url));
  }

  if (pathname.startsWith('/klinik') && userRole !== 'klinik') {
    const dash = userRole === 'admin' ? '/admin/dashboard' : '/employee/dashboard';
    return NextResponse.redirect(new URL(dash, request.url));
  }

  if (pathname.startsWith('/employee') && userRole !== 'karyawan') {
    const dash = userRole === 'admin' ? '/admin/dashboard' : '/klinik/dashboard';
    return NextResponse.redirect(new URL(dash, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images|api).*)'],
};
