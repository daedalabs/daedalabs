import { test, expect } from '@playwright/test';
import {
  buildSnippet,
  normalize,
  prepareTools,
  rankTools,
  stemWord,
  tokenizeQuery,
} from '../src/lib/search';
import { readmeToSearchText } from '../src/lib/readme-text';

const TOOLS = [
  {
    slug: 'clip-forge',
    name: 'clip-forge',
    tagline: 'Batch video converter for the desktop.',
    category: 'desktop',
    tags: ['video', 'ffmpeg', 'Rust'],
  },
  {
    slug: 'stream-router',
    name: 'stream-router',
    tagline: 'HTTP streaming proxy and SSE multiplexer.',
    category: 'microservice',
    tags: ['Go', 'sse', 'streaming'],
  },
  {
    slug: 'daeda-cli',
    name: 'daeda-cli',
    tagline: 'Terminal workbench for task automation.',
    category: 'cli',
    tags: ['Rust', 'terminal'],
  },
  {
    slug: 'notebook',
    name: 'notebook',
    tagline: 'Local markdown notes app.',
    category: 'web',
    tags: ['TypeScript', 'markdown'],
  },
] as const;

const DOCS: Record<string, string> = {
  'clip-forge':
    'Clip Forge turns recordings into animated GIFs. Editing a video is a single command: trim, scale, then export. Converting many files at once is the point.',
  'stream-router':
    'A tiny reverse proxy that multiplexes server-sent events. It keeps long-lived HTTP streams open and shares one connection across many clients.',
  'daeda-cli':
    'Run tasks from a keyboard-driven command palette. Configure your workspace once and reuse it everywhere.',
  notebook:
    'Write notes in Markdown and search them offline. Everything is stored in a local file. A clipboard helper is included.',
};

function prepared() {
  return prepareTools(TOOLS, DOCS);
}

test.describe('Search', () => {
  test('normalizes case, diacritics, and punctuation', () => {
    expect(normalize('Café—Résumé!!')).toBe('cafe resume');
    expect(normalize('C++ & C#')).toBe('c++ c#');
  });

  test('tokenization drops filler words but keeps the subject', () => {
    expect(tokenizeQuery('a tool for editing videos')).toEqual(['editing', 'videos']);
    expect(tokenizeQuery('something')).toEqual(['something']);
  });

  test('stemming shortens common English suffixes without going too far', () => {
    expect(stemWord('editing')).toBe('edit');
    expect(stemWord('videos')).toBe('video');
    expect(stemWord('compiling')).toBe('compil');
    expect(stemWord('pass')).toBe('pass');
    expect(stemWord('git')).toBe('git');
  });

  test('a name match outranks a README match for the same word', () => {
    const outcome = rankTools(prepared(), 'clip');
    expect(outcome.matches[0].tool.slug).toBe('clip-forge');
    expect(outcome.matches.map((match) => match.tool.slug)).toContain('notebook');
  });

  test('finds projects by README content alone', () => {
    const outcome = rankTools(prepared(), 'gifs');
    expect(outcome.mode).toBe('all');
    expect(outcome.matches).toHaveLength(1);
    expect(outcome.matches[0].tool.slug).toBe('clip-forge');
    expect(outcome.matches[0].snippet).toContain('animated GIFs');
  });

  test('a vague, conversational query still lands on the right project', () => {
    const outcome = rankTools(prepared(), 'something for editing recordings');
    expect(outcome.matches[0].tool.slug).toBe('clip-forge');
    expect(outcome.matches[0].snippet).toContain('recordings');
  });

  test('category synonyms work without the word appearing in the README', () => {
    const outcome = rankTools(prepared(), 'command line');
    expect(outcome.matches.map((match) => match.tool.slug)).toEqual(['daeda-cli']);
  });

  test('relaxes an over-specific query to the closest matches', () => {
    const outcome = rankTools(prepared(), 'proxy notebook');
    expect(outcome.mode).toBe('any');
    expect(outcome.matches.map((match) => match.tool.slug).sort()).toEqual([
      'notebook',
      'stream-router',
    ]);
  });

  test('recovers from a typo when nothing matches exactly', () => {
    const outcome = rankTools(prepared(), 'straming');
    expect(outcome.mode).toBe('fuzzy');
    expect(outcome.matches[0].tool.slug).toBe('stream-router');
  });

  test('name matches do not get a README snippet', () => {
    const outcome = rankTools(prepared(), 'stream');
    expect(outcome.matches[0].tool.slug).toBe('stream-router');
    expect(outcome.matches[0].snippet).toBeNull();
  });

  test('search still works before the README index has loaded', () => {
    const metadataOnly = prepareTools(TOOLS);
    const outcome = rankTools(metadataOnly, 'markdown notes');
    expect(outcome.matches[0].tool.slug).toBe('notebook');
  });

  test('snippets include an ellipsis when the match is deep in the text', () => {
    const content = `${'the quick brown fox jumps over the lazy dog '.repeat(10)}needle in a haystack`;
    const snippet = buildSnippet(content, ['needle']);
    expect(snippet).not.toBeNull();
    expect(snippet?.startsWith('…')).toBe(true);
    // The match must stay inside the two-line card excerpt.
    expect(snippet?.indexOf('needle') ?? 999).toBeLessThan(60);
  });

  test('empty or stopword-only queries do not throw', () => {
    expect(rankTools(prepared(), '').matches).toEqual([]);
    expect(rankTools(prepared(), 'the of for').matches).not.toBeUndefined();
  });

  test('README text extraction strips code and badges but keeps prose', () => {
    const markdown = [
      '# project',
      '',
      '[![build](https://img.shields.io/badge.svg)](https://ci.example.com)',
      '',
      '> Atomic commits make review easy.',
      '',
      '```bash',
      'npm install project',
      '```',
      '',
      '- Supports **stacked** branches',
      '- Links keep labels: [read the guide](https://example.com/guide)',
    ].join('\n');

    const text = readmeToSearchText(markdown);
    expect(text).toContain('Atomic commits make review easy');
    expect(text).toContain('Supports stacked branches');
    expect(text).toContain('Links keep labels: read the guide');
    expect(text).not.toContain('npm install');
    expect(text).not.toContain('img.shields.io');
    expect(text).not.toContain('```');
  });

  test('README text extraction respects the length budget', () => {
    const text = readmeToSearchText(`word ${'lorem ipsum '.repeat(500)}`, 120);
    expect(text.length).toBeLessThanOrEqual(120);
    expect(text.startsWith('word lorem')).toBe(true);
  });
});
