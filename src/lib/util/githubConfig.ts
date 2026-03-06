import { writable } from 'svelte/store';
import { env } from './env';
import { localStorage, persist } from './persist';

export interface GitHubConfig {
  path: string;
  repo: string;
  token: string;
}

const defaultConfig: GitHubConfig = {
  path: env.githubPath,
  repo: env.githubRepo,
  token: env.githubToken
};

export const githubConfigStore = persist(
  writable<GitHubConfig>(defaultConfig),
  localStorage(),
  'githubConfig'
);
