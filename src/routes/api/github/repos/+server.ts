import { githubFetch, jsonResponse, requireGitHubToken, type GitHubRepo } from '$lib/server/github';

interface GitHubRepoResponse {
  full_name: string;
  name: string;
  owner: {
    login: string;
  };
  permissions?: {
    push?: boolean;
  };
  private: boolean;
}

export const GET = async ({ cookies }) => {
  const token = requireGitHubToken(cookies);
  const repos: GitHubRepoResponse[] = [];

  for (let page = 1; ; page++) {
    const repoPage = await githubFetch<GitHubRepoResponse[]>(
      token,
      `/user/repos?per_page=100&page=${page}&sort=updated&affiliation=owner,collaborator,organization_member`
    );
    repos.push(...repoPage);

    if (repoPage.length < 100) {
      break;
    }
  }

  const writableRepos: GitHubRepo[] = repos
    .filter((repo) => repo.permissions?.push !== false)
    .map((repo) => ({
      fullName: repo.full_name,
      name: repo.name,
      owner: repo.owner.login,
      private: repo.private
    }));

  return jsonResponse({ repos: writableRepos });
};
