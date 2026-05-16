import { jsonResponse, githubFetch, requireGitHubToken } from '$lib/server/github';

interface GitHubUserResponse {
  avatar_url: string;
  html_url: string;
  login: string;
  name: string | null;
}

export const GET = async ({ cookies }) => {
  const token = requireGitHubToken(cookies);
  const user = await githubFetch<GitHubUserResponse>(token, '/user');
  return jsonResponse({
    avatarUrl: user.avatar_url,
    htmlUrl: user.html_url,
    login: user.login,
    name: user.name
  });
};
