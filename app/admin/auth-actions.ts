'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function loginAdmin(formData: FormData) {
  const password = formData.get('password') as string;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (password !== adminPassword) {
    return { error: 'Password salah!' };
  }

  // Buat JWT sesi
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 jam
  const { encrypt } = await import('@/lib/auth');
  const sessionToken = await encrypt({ role: 'admin', expires });

  // Set cookie
  const cookieStore = await cookies();
  cookieStore.set('naratif_session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expires,
  });

  return { success: true };
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete('naratif_session');
  redirect('/admin/login');
}
