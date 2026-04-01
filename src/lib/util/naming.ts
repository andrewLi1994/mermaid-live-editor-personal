import { generateSlug } from 'random-word-slugs';

/**
 * Generates a unique, readable diagram name.
 * Format: [word]-[word]-[random4chars].mmd
 */
export const generateDiagramName = (): string => {
  const slug = generateSlug(2);
  const randomId = Math.random().toString(16).substring(2, 6);
  return `${slug}-${randomId}.mmd`.toLowerCase();
};
