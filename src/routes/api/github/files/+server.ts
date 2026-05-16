import {
  githubFetch,
  jsonResponse,
  parseRepo,
  parseRepoPath,
  requireGitHubToken,
  type GitHubFile
} from '$lib/server/github';
import { isHttpError } from '@sveltejs/kit';

export const GET = async ({ cookies, url }) => {
  const token = requireGitHubToken(cookies);
  const repo = parseRepo(url.searchParams.get('repo'));
  const repoPath = parseRepoPath(url.searchParams.get('path'));
  const encodedPath = repoPath ? `/${repoPath.split('/').map(encodeURIComponent).join('/')}` : '';

  let data: GitHubFile[] | GitHubFile;
  try {
    data = await githubFetch<GitHubFile[] | GitHubFile>(
      token,
      `/repos/${repo}/contents${encodedPath}?t=${Date.now()}`
    );
  } catch (error) {
    if (isHttpError(error, 404)) {
      return jsonResponse({ files: [] });
    }
    throw error;
  }

  const files = Array.isArray(data)
    ? data.filter((file) => file.type !== 'dir' && file.name.endsWith('.mmd'))
    : [];

  return jsonResponse({ files });
};
