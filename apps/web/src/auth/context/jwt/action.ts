'use client';

import axios, { endpoints } from 'src/lib/axios';

import { setSession } from './utils';
import { JWT_REFRESH_KEY } from './constant';

// ----------------------------------------------------------------------

export type SignInParams = {
  phone: string;
  password: string;
};

/** **************************************
 * Sign in (admin-login: super_admin, company_admin, kitchen_admin)
 *************************************** */
export const signInWithPassword = async ({ phone, password }: SignInParams): Promise<void> => {
  try {
    // telefon raqamdan bo'shliqlarni olib tashlaymiz
    const cleanPhone = phone.replace(/\s/g, '');
    const res = await axios.post(endpoints.auth.adminLogin, { phone: cleanPhone, password });

    const { access_token, refresh_token } = res.data;

    if (!access_token) throw new Error('Access token not found in response');

    if (refresh_token) sessionStorage.setItem(JWT_REFRESH_KEY, refresh_token);

    setSession(access_token);
  } catch (error) {
    console.error('Error during sign in:', error);
    throw error;
  }
};

/** **************************************
 * Sign out
 *************************************** */
export const signOut = async (): Promise<void> => {
  try {
    const refreshToken = sessionStorage.getItem(JWT_REFRESH_KEY);
    if (refreshToken) {
      try {
        await axios.post(endpoints.auth.logout, { refresh_token: refreshToken });
      } catch {
        // ignore network errors on logout
      }
      sessionStorage.removeItem(JWT_REFRESH_KEY);
    }
    await setSession(null);
  } catch (error) {
    console.error('Error during sign out:', error);
    throw error;
  }
};
