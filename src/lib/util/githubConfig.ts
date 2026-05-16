import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { env } from './env';
import { localStorage, persist } from './persist';

export interface GitHubConfig {
  path: string;
  repo: string;
}

const defaultConfig: GitHubConfig = {
  path: env.githubPath,
  repo: env.githubRepo
};

export const githubConfigStore = persist(
  writable<GitHubConfig>(defaultConfig),
  localStorage(),
  'githubConfig'
);

if (browser) {
  githubConfigStore.update((config) => ({
    path: config?.path ?? env.githubPath,
    repo: config?.repo ?? env.githubRepo
  }));
}
