import { writable } from 'svelte/store';
import { localStorage, persist } from './persist';

export type AIProvider = 'gemini' | 'openai';

export interface AIConfig {
  provider: AIProvider;
  geminiKey: string;
  openaiKey: string;
  model: string;
}

export const defaultAIConfig: AIConfig = {
  geminiKey: '',
  model: 'gemini-3.1-flash-preview',
  openaiKey: '',
  provider: 'gemini'
};

export const aiConfigStore = persist(writable(defaultAIConfig), localStorage(), 'aiConfig');

export const updateAIConfig = (config: Partial<AIConfig>): void => {
  aiConfigStore.update((c) => ({ ...c, ...config }));
};
