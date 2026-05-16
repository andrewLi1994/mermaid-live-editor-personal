import { json } from '@sveltejs/kit';
import { clearAccessTokenCookie } from '$lib/server/github';

export const POST = ({ cookies }) => {
  clearAccessTokenCookie(cookies);
  return json({ ok: true });
};
