import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  const isProtectedRoute = path.startsWith('/admin') && path !== '/admin/login';

  if (isProtectedRoute) {
    const cookie = request.cookies.get('naratif_session')?.value;
    
    if (!cookie) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    try {
      // Verifikasi token JWT
      const session = await decrypt(cookie);
      if (!session) {
        throw new Error('Invalid session');
      }
    } catch (error) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // Mencegah user yang sudah login pergi ke halaman login lagi
  if (path === '/admin/login') {
    const cookie = request.cookies.get('naratif_session')?.value;
    if (cookie) {
      try {
        const session = await decrypt(cookie);
        if (session) {
          return NextResponse.redirect(new URL('/admin', request.url));
        }
      } catch (error) {
        // Biarkan lolos jika error
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
