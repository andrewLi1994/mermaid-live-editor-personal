import { Base64 } from 'js-base64';
import { error, json, redirect, type Cookies } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

const GITHUB_API_URL = 'https://api.github.com';
const AUTH_COOKIE = 'github_access_token';
const STATE_COOKIE = 'github_oauth_state';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export interface GitHubRepo {
  fullName: string;
  name: string;
  owner: string;
  private: boolean;
}

export interface GitHubFile {
  name: string;
  path: string;
  sha?: string;
  type?: string;
}

const cookieOptions = (url: URL) => ({
  httpOnly: true,
  maxAge: COOKIE_MAX_AGE,
  path: '/',
  sameSite: 'lax' as const,
  secure: url.protocol === 'https:'
});

export const createOAuthState = () => crypto.randomUUID();

export const getGitHubClientId = () => publicEnv.PUBLIC_GITHUB_CLIENT_ID;

export const getGitHubClientSecret = () => privateEnv.GITHUB_CLIENT_SECRET;

export const setOAuthStateCookie = (cookies: Cookies, state: string, url: URL) => {
  cookies.set(STATE_COOKIE, state, {
    ...cookieOptions(url),
    maxAge: 60 * 10
  });
};

export const verifyOAuthState = (cookies: Cookies, state: string | null) => {
  const expectedState = cookies.get(STATE_COOKIE);
  cookies.delete(STATE_COOKIE, { path: '/' });
  return !!state && !!expectedState && state === expectedState;
};

export const setAccessTokenCookie = (cookies: Cookies, token: string, url: URL) => {
  cookies.set(AUTH_COOKIE, token, cookieOptions(url));
};

export const clearAccessTokenCookie = (cookies: Cookies) => {
  cookies.delete(AUTH_COOKIE, { path: '/' });
};

export const requireGitHubToken = (cookies: Cookies) => {
  const token = cookies.get(AUTH_COOKIE);
  if (!token) {
    error(401, 'GitHub login required');
  }
  return token;
};

export const jsonResponse = <T>(data: T) => json(data);

export const redirectToGitHubLogin = (url: URL, cookies: Cookies, returnTo: string) => {
  const clientId = getGitHubClientId();
  if (!clientId) {
    error(500, 'PUBLIC_GITHUB_CLIENT_ID is not configured');
  }

  const state = createOAuthState();
  setOAuthStateCookie(cookies, state, url);

  const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('scope', 'repo');
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('redirect_uri', `${url.origin}/api/auth/github/callback`);
  authorizeUrl.searchParams.set('allow_signup', 'true');

  cookies.set('github_oauth_return_to', returnTo || '/edit', {
    ...cookieOptions(url),
    maxAge: 60 * 10
  });

  redirect(302, authorizeUrl.toString());
};

export const getOAuthReturnPath = (cookies: Cookies) => {
  const returnTo = cookies.get('github_oauth_return_to') || '/edit';
  cookies.delete('github_oauth_return_to', { path: '/' });
  return returnTo.startsWith('/') ? returnTo : '/edit';
};

const getErrorMessage = async (response: Response) => {
  try {
    const data = await response.json();
    if (typeof data?.message === 'string') {
      return data.message;
    }
  } catch {
    // Fall back to status text below.
  }
  return response.statusText || `GitHub API request failed with ${response.status}`;
};

export const githubFetch = async <T>(
  token: string,
  path: string,
  init: RequestInit = {}
): Promise<T> => {
  const response = await fetch(`${GITHUB_API_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...init.headers
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    error(response.status, await getErrorMessage(response));
  }

  return (await response.json()) as T;
};

export const exchangeOAuthCode = async (code: string, url: URL) => {
  const clientId = getGitHubClientId();
  const clientSecret = getGitHubClientSecret();
  if (!clientId || !clientSecret) {
    error(500, 'GitHub OAuth credentials are not fully configured');
  }

  const response = await fetch('https://github.com/login/oauth/access_token', {
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: `${url.origin}/api/auth/github/callback`
    }),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    method: 'POST'
  });

  const data = await response.json();
  if (!response.ok || data.error) {
    error(400, data.error_description || data.error || 'GitHub OAuth exchange failed');
  }

  if (!data.access_token) {
    error(400, 'GitHub OAuth response did not include an access token');
  }

  return data.access_token as string;
};

export const parseRepo = (repo: string | null) => {
  const value = repo?.trim();
  if (!value || !/^[^/\s]+\/[^/\s]+$/.test(value)) {
    error(400, 'Repository must use the owner/repo format');
  }
  return value;
};

export const parseRepoPath = (path: string | null) => {
  const value = path?.trim().replace(/^\/+|\/+$/g, '') ?? '';
  if (value.includes('..')) {
    error(400, 'Path cannot contain ..');
  }
  return value;
};

export const parseFilePath = (path: string | null) => {
  const value = parseRepoPath(path);
  if (!value) {
    error(400, 'File path is required');
  }
  return value;
};

export const encodeContent = (content: string) => Base64.encode(content);

export const decodeContent = (content: string) => Base64.decode(content.replace(/\n/g, ''));
