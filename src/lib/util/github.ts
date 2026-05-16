import { get, writable } from 'svelte/store';
import { githubConfigStore } from './githubConfig';

export interface GitHubFile {
  name: string;
  path: string;
  sha?: string;
  [key: string]: unknown;
}

export interface GitHubRepo {
  fullName: string;
  name: string;
  owner: string;
  private: boolean;
}

export interface GitHubUser {
  avatarUrl: string;
  htmlUrl: string;
  login: string;
  name: string | null;
}

/** Shared store holding the list of .mmd files from GitHub. */
export const githubFilesStore = writable<GitHubFile[]>([]);
export const githubReposStore = writable<GitHubRepo[]>([]);
export const githubUserStore = writable<GitHubUser | null>(null);

const getErrorMessage = async (response: Response) => {
  try {
    const data = await response.json();
    if (typeof data?.message === 'string') {
      return data.message;
    }
  } catch {
    // Fall back to status text below.
  }
  return response.statusText || `Request failed with ${response.status}`;
};

const apiFetch = async <T>(url: string, init: RequestInit = {}) => {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...init.headers
    }
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return (await response.json()) as T;
};

export const getGitHubUser = async () => {
  const user = await apiFetch<GitHubUser>('/api/github/me');
  githubUserStore.set(user);
  return user;
};

export const logoutGitHub = async () => {
  await apiFetch<{ ok: boolean }>('/api/auth/github/logout', { method: 'POST' });
  githubUserStore.set(null);
  githubReposStore.set([]);
  githubFilesStore.set([]);
};

export const loginGitHub = () => {
  window.location.href = `/api/auth/github/login?returnTo=${encodeURIComponent(
    window.location.pathname || '/edit'
  )}`;
};

export const listRepositories = async () => {
  const data = await apiFetch<{ repos: GitHubRepo[] }>('/api/github/repos');
  githubReposStore.set(data.repos);
  return data.repos;
};

export const listDiagrams = async () => {
  const { path, repo } = get(githubConfigStore);
  if (!repo) {
    throw new Error('GitHub configuration missing');
  }

  const params = new URLSearchParams({ repo, path });
  const { files } = await apiFetch<{ files: GitHubFile[] }>(`/api/github/files?${params}`);
  githubFilesStore.set(files);
  return files;
};

export const getFileContent = async (filePath: string) => {
  const { repo } = get(githubConfigStore);
  if (!repo) {
    throw new Error('GitHub configuration missing');
  }

  const params = new URLSearchParams({ repo, path: filePath });
  const data = await apiFetch<{ content: string }>(`/api/github/file?${params}`);
  return data.content;
};

export const saveDiagram = async (
  filename: string,
  content: string,
  options: { originalFilename?: string; saveAsCopy?: boolean } = {}
) => {
  const { originalFilename, saveAsCopy } = options;
  const { path, repo } = get(githubConfigStore);
  if (!repo) {
    throw new Error('GitHub configuration missing');
  }

  const filePath = path ? `${path}/${filename}` : filename;
  let sha: string | undefined;

  // 1. Try to get the file SHA (for the new/target file)
  try {
    const data = await apiFetch<{ sha: string }>(
      `/api/github/file?${new URLSearchParams({ repo, path: filePath })}`
    );
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
  } catch (error) {
    if (error instanceof Error && error.message === 'Save cancelled by user') {
      throw error;
    }
    if (!(error instanceof Error && error.message === 'Not Found')) {
      console.error('Error fetching file SHA:', error);
    }
  }

  // 2. PUT the file
  await apiFetch('/api/github/file', {
    body: JSON.stringify({
      content,
      message: `Update ${filename} from Mermaid Live Editor`,
      path: filePath,
      repo,
      sha
    }),
    headers: {
      'Content-Type': 'application/json'
    },
    method: 'PUT'
  });

  // 3. Handle Rename: Delete the original file if it's different, it was explicitly provided, and we're not saving as copy
  if (originalFilename && originalFilename !== filename && !saveAsCopy) {
    const originalFilePath = path ? `${path}/${originalFilename}` : originalFilename;
    try {
      // First get the SHA of the original file
      const originalData = await apiFetch<{ sha: string }>(
        `/api/github/file?${new URLSearchParams({ repo, path: originalFilePath })}`
      );
      // Then delete it
      await apiFetch('/api/github/file', {
        body: JSON.stringify({
          message: `Delete ${originalFilename} after renaming to ${filename}`,
          path: originalFilePath,
          repo,
          sha: originalData.sha
        }),
        headers: {
          'Content-Type': 'application/json'
        },
        method: 'DELETE'
      });

      // Update the originalFilename in the store so subsequent saves work as updates
      // We import it dynamically here to avoid circular dependency since state.ts imports github.ts
      const { updateCodeStore } = await import('./state');
      updateCodeStore({ originalFilename: filename });
    } catch (error) {
      console.error('Error deleting original file after rename:', error);
      // We don't throw an error here because the save was already successful
    }
  }
};

export const deleteDiagram = async (filePath: string) => {
  const { repo } = get(githubConfigStore);
  if (!repo) {
    throw new Error('GitHub configuration missing');
  }

  await apiFetch('/api/github/file', {
    body: JSON.stringify({
      message: `Delete ${filePath} via Mermaid Live Editor`,
      path: filePath,
      repo
    }),
    headers: {
      'Content-Type': 'application/json'
    },
    method: 'DELETE'
  });
};
