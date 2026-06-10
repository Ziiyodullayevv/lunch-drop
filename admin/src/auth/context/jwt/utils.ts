import { paths } from 'src/routes/paths';

import axios from 'src/lib/axios';

import { JWT_STORAGE_KEY, JWT_REFRESH_KEY } from './constant';

// ----------------------------------------------------------------------

export function jwtDecode(token: string) {
  try {
    if (!token) return null;

    const parts = token.split('.');
    if (parts.length < 2) {
      throw new Error('Invalid token!');
    }

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(base64));

    return decoded;
  } catch (error) {
    console.error('Error decoding token:', error);
    throw error;
  }
}

// ----------------------------------------------------------------------

export function isValidToken(accessToken: string) {
  if (!accessToken) {
    return false;
  }

  try {
    const decoded = jwtDecode(accessToken);

    if (!decoded || !('exp' in decoded)) {
      return false;
    }

    const currentTime = Date.now() / 1000;

    return decoded.exp > currentTime;
  } catch (error) {
    console.error('Error during token validation:', error);
    return false;
  }
}

// ----------------------------------------------------------------------

let _refreshTimer: ReturnType<typeof setTimeout> | null = null;

async function tryRefresh(): Promise<string | null> {
  const refreshToken = sessionStorage.getItem(JWT_REFRESH_KEY);
  if (!refreshToken) return null;

  try {
    const res = await axios.post('/api/v1/auth/refresh-token', { refresh_token: refreshToken });
    const { access_token, refresh_token: newRefresh } = res.data;
    if (newRefresh) sessionStorage.setItem(JWT_REFRESH_KEY, newRefresh);
    return access_token as string;
  } catch {
    return null;
  }
}

function signOutAndRedirect() {
  sessionStorage.removeItem(JWT_STORAGE_KEY);
  sessionStorage.removeItem(JWT_REFRESH_KEY);
  delete axios.defaults.headers.common.Authorization;
  window.location.href = paths.auth.jwt.signIn;
}

export function tokenExpired(exp: number) {
  if (_refreshTimer) clearTimeout(_refreshTimer);

  const currentTime = Date.now();
  const timeLeft = exp * 1000 - currentTime;
  // Try to refresh 60 seconds before expiry
  const delay = Math.max(timeLeft - 60_000, 0);

  _refreshTimer = setTimeout(async () => {
    const newToken = await tryRefresh();
    if (newToken) {
      // setSession will schedule the next refresh
      await setSession(newToken);
    } else {
      signOutAndRedirect();
    }
  }, delay);
}

// ----------------------------------------------------------------------

export async function setSession(accessToken: string | null) {
  try {
    if (accessToken) {
      sessionStorage.setItem(JWT_STORAGE_KEY, accessToken);

      axios.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

      const decodedToken = jwtDecode(accessToken);

      if (decodedToken && 'exp' in decodedToken) {
        tokenExpired(decodedToken.exp);
      } else {
        throw new Error('Invalid access token!');
      }
    } else {
      if (_refreshTimer) clearTimeout(_refreshTimer);
      sessionStorage.removeItem(JWT_STORAGE_KEY);
      sessionStorage.removeItem(JWT_REFRESH_KEY);
      delete axios.defaults.headers.common.Authorization;
    }
  } catch (error) {
    console.error('Error during set session:', error);
    throw error;
  }
}
