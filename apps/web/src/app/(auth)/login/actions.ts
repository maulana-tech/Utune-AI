'use server';

import { redirect } from 'next/navigation';
import { verifyCredentials, setSession, clearSession } from '@/lib/auth';

export async function signInAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const username = String(formData.get('username') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const redirectTo = String(formData.get('redirectTo') ?? '/dashboard') || '/dashboard';

  if (!username || !password) {
    return { error: 'Username and password required' };
  }
  if (!verifyCredentials(username, password)) {
    return { error: 'Invalid username or password' };
  }
  await setSession();
  redirect(redirectTo);
}

export async function signOutAction(): Promise<void> {
  await clearSession();
  redirect('/login');
}
