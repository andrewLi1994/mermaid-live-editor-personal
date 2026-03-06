import { Base64 } from 'js-base64';
import { get } from 'svelte/store';
import { githubConfigStore } from './githubConfig';

const GITHUB_API_URL = 'https://api.github.com';

export const listDiagrams = async () => {
  const { path, repo, token } = get(githubConfigStore);
  if (!token || !repo) {
    throw new Error('GitHub configuration missing');
  }

  const response = await fetch(`${GITHUB_API_URL}/repos/${repo}/contents/${path}`, {
    headers: {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `token ${token}`
    }
  });

  if (!response.ok) {
    if (response.status === 404) {
      return [];
    }
    throw new Error(`Failed to list diagrams: ${response.statusText}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    return [];
  }
  return data.filter((file: { name: string }) => file.name.endsWith('.mmd'));
};

export const getFileContent = async (filePath: string) => {
  const { repo, token } = get(githubConfigStore);
  const response = await fetch(`${GITHUB_API_URL}/repos/${repo}/contents/${filePath}`, {
    headers: {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `token ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.statusText}`);
  }

  const data = await response.json();
  return Base64.decode(data.content);
};

export const saveDiagram = async (filename: string, content: string) => {
  const { path, repo, token } = get(githubConfigStore);
  if (!token || !repo) {
    throw new Error('GitHub configuration missing');
  }

  const filePath = path ? `${path}/${filename}` : filename;
  let sha: string | undefined;

  // 1. Try to get the file SHA
  try {
    const res = await fetch(`${GITHUB_API_URL}/repos/${repo}/contents/${filePath}`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `token ${token}`
      }
    });
    if (res.ok) {
      const data = await res.json();
      sha = data.sha;
    }
  } catch (error) {
    console.error('Error fetching file SHA:', error);
  }

  // 2. PUT the file
  const response = await fetch(`${GITHUB_API_URL}/repos/${repo}/contents/${filePath}`, {
    body: JSON.stringify({
      content: Base64.encode(content),
      message: `Update ${filename} from Mermaid Live Editor`,
      sha
    }),
    headers: {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `token ${token}`,
      'Content-Type': 'application/json'
    },
    method: 'PUT'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to save diagram: ${error.message || response.statusText}`);
  }
};
