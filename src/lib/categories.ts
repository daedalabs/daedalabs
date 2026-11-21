export const CATEGORY_IDS = [
  'byox',
  'desktop',
  'web',
  'cli',
  'library',
  'plugin',
  'ai',
  'automation',
  'hardware',
  'microservice',
  'other',
] as const;

export type Category = (typeof CATEGORY_IDS)[number];

export const categoryLabels: Record<Category, string> = {
  byox: 'build your own',
  desktop: 'desktop',
  web: 'web',
  cli: 'cli',
  library: 'library',
  plugin: 'plugin',
  ai: 'ai',
  automation: 'automation',
  hardware: 'hardware',
  microservice: 'service',
  other: 'tool',
};

/**
 * Extra words a visitor might type when they mean a category. These are folded
 * into the search text so vague queries like "command line app" or
 * "something embedded" can still find the right projects without the README
 * having to repeat the category name.
 */
export const categorySearchTerms: Record<Category, string> = {
  byox: 'recreate reimplementation clone from scratch learn internals',
  desktop: 'native gui window application app program',
  web: 'browser frontend front-end website site nextjs react',
  cli: 'command line terminal shell console tui',
  library: 'sdk package module dependency npm crate',
  plugin: 'obsidian extension addon module integration',
  ai: 'llm machine learning model embeddings vector inference',
  automation: 'bot workflow cron scheduler pipeline action',
  hardware: 'embedded firmware iot microcontroller board device',
  microservice: 'backend api server service proxy http',
  other: 'utility misc miscellaneous',
};

const KNOWN_CATEGORIES = new Set<string>(CATEGORY_IDS);

export function isKnownCategory(value: string): value is Category {
  return KNOWN_CATEGORIES.has(value);
}

/** Normalized-for-search text for a category id, label, and synonyms. */
export function categorySearchText(category: string): string {
  const key: Category = isKnownCategory(category) ? category : 'other';
  return `${key} ${categoryLabels[key]} ${categorySearchTerms[key]}`;
}
