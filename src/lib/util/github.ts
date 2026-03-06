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

export const saveDiagram = async (filename: string, content: string, originalFilename?: string) => {
  const { path, repo, token } = get(githubConfigStore);
  if (!token || !repo) {
    throw new Error('GitHub configuration missing');
  }

  const filePath = path ? `${path}/${filename}` : filename;
  let sha: string | undefined;

  // 1. Try to get the file SHA (for the new/target file)
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

      // If the target file exists, but it's not the file we originally loaded, warn the user.
      if (originalFilename !== filename) {
        if (
          !confirm(
            `The file "${filename}" already exists in the repository.\n\nDo you want to overwrite it?`
          )
        ) {
          throw new Error('Save cancelled by user');
        }
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'Save cancelled by user') {
      throw error;
    }
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

  // 3. Handle Rename: Delete the original file if it's different and was explicitly provided
  if (originalFilename && originalFilename !== filename) {
    const originalFilePath = path ? `${path}/${originalFilename}` : originalFilename;
    try {
      // First get the SHA of the original file
      const originalRes = await fetch(
        `${GITHUB_API_URL}/repos/${repo}/contents/${originalFilePath}`,
        {
          headers: {
            Accept: 'application/vnd.github.v3+json',
            Authorization: `token ${token}`
          }
        }
      );
      if (originalRes.ok) {
        const originalData = await originalRes.json();
        const originalSha = originalData.sha;

        // Then delete it
        await fetch(`${GITHUB_API_URL}/repos/${repo}/contents/${originalFilePath}`, {
          body: JSON.stringify({
            message: `Delete ${originalFilename} after renaming to ${filename}`,
            sha: originalSha
          }),
          headers: {
            Accept: 'application/vnd.github.v3+json',
            Authorization: `token ${token}`,
            'Content-Type': 'application/json'
          },
          method: 'DELETE'
        });

        // Update the originalFilename in the store so subsequent saves work as updates
        // We import it dynamically here to avoid circular dependency since state.ts imports github.ts
        const { updateCodeStore } = await import('./state');
        updateCodeStore({ originalFilename: filename });
      }
    } catch (error) {
      console.error('Error deleting original file after rename:', error);
      // We don't throw an error here because the save was already successful
    }
  }
};
