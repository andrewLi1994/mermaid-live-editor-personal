import {
  decodeContent,
  encodeContent,
  githubFetch,
  jsonResponse,
  parseFilePath,
  parseRepo,
  requireGitHubToken,
  type GitHubFile
} from '$lib/server/github';

interface GitHubContentResponse extends GitHubFile {
  content: string;
}

interface SaveRequest {
  content: string;
  message?: string;
  path: string;
  repo: string;
  sha?: string;
}

interface DeleteRequest {
  message?: string;
  path: string;
  repo: string;
  sha?: string;
}

const encodeFilePath = (filePath: string) => filePath.split('/').map(encodeURIComponent).join('/');

const getFile = async (token: string, repo: string, filePath: string) =>
  githubFetch<GitHubContentResponse>(
    token,
    `/repos/${repo}/contents/${encodeFilePath(filePath)}?t=${Date.now()}`
  );

export const GET = async ({ cookies, url }) => {
  const token = requireGitHubToken(cookies);
  const repo = parseRepo(url.searchParams.get('repo'));
  const filePath = parseFilePath(url.searchParams.get('path'));
  const data = await getFile(token, repo, filePath);
  return jsonResponse({
    content: decodeContent(data.content),
    name: data.name,
    path: data.path,
    sha: data.sha
  });
};

export const PUT = async ({ cookies, request }) => {
  const token = requireGitHubToken(cookies);
  const body = (await request.json()) as SaveRequest;
  const repo = parseRepo(body.repo);
  const filePath = parseFilePath(body.path);

  const result = await githubFetch(token, `/repos/${repo}/contents/${encodeFilePath(filePath)}`, {
    body: JSON.stringify({
      content: encodeContent(body.content),
      message: body.message || `Update ${filePath} from Mermaid Live Editor`,
      sha: body.sha
    }),
    headers: {
      'Content-Type': 'application/json'
    },
    method: 'PUT'
  });

  return jsonResponse(result);
};

export const DELETE = async ({ cookies, request }) => {
  const token = requireGitHubToken(cookies);
  const body = (await request.json()) as DeleteRequest;
  const repo = parseRepo(body.repo);
  const filePath = parseFilePath(body.path);

  const sha = body.sha || (await getFile(token, repo, filePath)).sha;
  const result = await githubFetch(token, `/repos/${repo}/contents/${encodeFilePath(filePath)}`, {
    body: JSON.stringify({
      message: body.message || `Delete ${filePath} via Mermaid Live Editor`,
      sha
    }),
    headers: {
      'Content-Type': 'application/json'
    },
    method: 'DELETE'
  });

  return jsonResponse(result);
};
