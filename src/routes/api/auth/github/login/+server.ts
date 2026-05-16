import { redirectToGitHubLogin } from '$lib/server/github';

export const GET = ({ cookies, url }) => {
  redirectToGitHubLogin(url, cookies, url.searchParams.get('returnTo') || '/edit');
};
