import { error, redirect } from '@sveltejs/kit';
import {
  exchangeOAuthCode,
  getOAuthReturnPath,
  setAccessTokenCookie,
  verifyOAuthState
} from '$lib/server/github';

export async function GET({ cookies, url }) {
  const code = url.searchParams.get('code');
  if (!code) {
    error(400, 'No code provided by GitHub');
  }

  if (!verifyOAuthState(cookies, url.searchParams.get('state'))) {
    error(400, 'Invalid GitHub OAuth state');
  }

  const accessToken = await exchangeOAuthCode(code, url);
  setAccessTokenCookie(cookies, accessToken, url);
  redirect(302, getOAuthReturnPath(cookies));
}
