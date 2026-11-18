import { categorySearchText } from './categories';

/**
 * Shared, dependency-free search used by the tools explorer.
 *
 * The catalog is small, so instead of shipping an index library we prepare a
 * compact in-memory document per project (metadata + README plain text) and
 * score queries against it. Three behaviours matter for "vague" searches:
 *
 * 1. Multi-word queries are matched as AND first, then relaxed to OR.
 * 2. Query words are stemmed, so "editing videos" finds "video editor".
 * 3. A typo-tolerant pass runs when nothing matches exactly.
 */

export interface SearchableTool {
  slug: string;
  name: string;
  tagline: string;
  tags: readonly string[];
  category: string;
  status?: string;
  primaryLanguage?: string | null;
  license?: string | null;
}

export interface PreparedTool<T extends SearchableTool> {
  tool: T;
  name: string;
  slug: string;
  tagline: string;
  tags: string[];
  category: string;
  extras: string;
  content: string;
  contentLower: string;
}

export interface ToolMatch<T extends SearchableTool> {
  tool: T;
  score: number;
  /** A short excerpt from the README showing why the project matched. */
  snippet: string | null;
}

export type SearchMode = 'all' | 'any' | 'fuzzy';

export interface SearchOutcome<T extends SearchableTool> {
  matches: ToolMatch<T>[];
  mode: SearchMode;
  /** Equivalent query words used for highlighting, including stems. */
  terms: string[];
  phrase: string;
}

/** Words that carry no signal on their own in a catalog search. */
const STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'of',
  'for',
  'to',
  'with',
  'in',
  'on',
  'at',
  'by',
  'from',
  'into',
  'over',
  'under',
  'about',
  'and',
  'or',
  'nor',
  'but',
  'so',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'it',
  'its',
  'itself',
  'this',
  'that',
  'these',
  'those',
  'there',
  'here',
  'i',
  'me',
  'my',
  'mine',
  'we',
  'us',
  'our',
  'you',
  'your',
  'he',
  'she',
  'they',
  'them',
  'their',
  'what',
  'which',
  'who',
  'whom',
  'whose',
  'when',
  'where',
  'why',
  'how',
  'do',
  'does',
  'did',
  'done',
  'can',
  'could',
  'should',
  'would',
  'will',
  'shall',
  'may',
  'might',
  'must',
  'just',
  'some',
  'any',
  'all',
  'both',
  'each',
  'every',
  'not',
  'only',
  'very',
  'really',
  'actually',
  'something',
  'anything',
  'nothing',
  'stuff',
  'thing',
  'things',
  'project',
  'projects',
  'repo',
  'repos',
  'repository',
  'repositories',
  'tool',
  'tools',
  'looking',
  'look',
  'want',
  'need',
  'please',
  'show',
  'find',
  'related',
  'like',
  'using',
  'use',
  'used',
  'help',
  'helps',
  'helping',
  'able',
  'maybe',
  'perhaps',
  'basically',
  'simply',
  'exactly',
  'specific',
  'particular',
]);

const NON_WORD = /[^\p{L}\p{N}+#]+/gu;
const COMBINING_MARKS = /[\u0300-\u036f]/g;

/** Lowercase, strip diacritics, and collapse punctuation into single spaces. */
export function normalize(value: string): string {
  return value
    .normalize('NFKD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(NON_WORD, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/**
 * Very small, prefix-friendly English stemmer. Exact stems still match the
 * original word with `indexOf`, so this only ever adds recall.
 */
export function stemWord(word: string): string {
  if (word.length <= 4) return word;
  if (word.endsWith('ies') && word.length > 5) return `${word.slice(0, -3)}y`;
  if (word.endsWith('ing') && word.length > 6) return word.slice(0, -3);
  if (word.endsWith('ers') && word.length > 6) return word.slice(0, -3);
  if (word.endsWith('er') && word.length > 6) return word.slice(0, -2);
  if (word.endsWith('ed') && word.length > 5) return word.slice(0, -2);
  if (word.endsWith('es') && word.length > 5) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 5) {
    return word.slice(0, -1);
  }
  return word;
}

/** The raw word plus its stem, de-duplicated and in that order. */
export function termVariants(term: string): string[] {
  const stem = stemWord(term);
  return stem === term ? [term] : [term, stem];
}

export function tokenizeQuery(query: string): string[] {
  const normalized = normalize(query);
  if (!normalized) return [];

  const words = normalized.split(' ').filter(Boolean);
  const meaningful = words.filter((word) => !STOPWORDS.has(word));
  // A query made entirely of stopwords ("how do i use this") should not be
  // rejected silently; fall back to the raw words.
  const terms = meaningful.length > 0 ? meaningful : words;
  return Array.from(new Set(terms));
}

/** Build the compact per-project documents the ranker works on. */
export function prepareTools<T extends SearchableTool>(
  tools: readonly T[],
  contentBySlug?: Record<string, string | undefined> | null
): PreparedTool<T>[] {
  return tools.map((tool) => {
    const content = collapseWhitespace(contentBySlug?.[tool.slug] ?? '');
    return {
      tool,
      name: normalize(tool.name),
      slug: normalize(tool.slug),
      tagline: normalize(tool.tagline),
      tags: tool.tags.map((tag) => normalize(tag)).filter(Boolean),
      category: normalize(categorySearchText(tool.category)),
      extras: normalize(
        [tool.primaryLanguage, tool.license, tool.status].filter(Boolean).join(' ')
      ),
      content,
      contentLower: content.toLowerCase(),
    };
  });
}

interface FieldWeights {
  exact: number;
  start: number;
  inside: number;
}

const NAME_WEIGHTS: FieldWeights = { exact: 70, start: 40, inside: 24 };
const SLUG_WEIGHTS: FieldWeights = { exact: 30, start: 20, inside: 14 };
const TAGLINE_WEIGHTS: FieldWeights = { exact: 20, start: 14, inside: 9 };
const TAG_WEIGHTS: FieldWeights = { exact: 26, start: 18, inside: 12 };
const CATEGORY_WEIGHTS: FieldWeights = { exact: 14, start: 10, inside: 6 };
const EXTRAS_WEIGHTS: FieldWeights = { exact: 10, start: 7, inside: 4 };

function bestFieldScore(
  field: string,
  variants: readonly string[],
  weights: FieldWeights
): number {
  if (!field) return 0;

  let best = 0;
  for (const variant of variants) {
    const index = field.indexOf(variant);
    if (index === -1) continue;

    const isBoundary = index === 0 || field.charAt(index - 1) === ' ';
    // Short words such as "ai" and "go" are only trusted on word boundaries;
    // otherwise "ai" would match "maintain" and "explain".
    if (!isBoundary && variant.length < 4) continue;

    const score =
      field === variant ? weights.exact : isBoundary ? weights.start : weights.inside;
    if (score > best) best = score;
  }
  return best;
}

interface ContentHit {
  score: number;
  index: number;
}

function scoreContent(contentLower: string, variants: readonly string[]): ContentHit {
  let best: ContentHit = { score: 0, index: -1 };

  for (const variant of variants) {
    let count = 0;
    let first = -1;
    let wordStarts = 0;
    let position = contentLower.indexOf(variant);

    while (position !== -1 && count < 20) {
      const isBoundary = position === 0 || contentLower.charAt(position - 1) === ' ';
      if (!isBoundary && variant.length < 4) {
        position = contentLower.indexOf(variant, position + variant.length);
        continue;
      }

      if (first === -1) first = position;
      count += 1;
      if (isBoundary) wordStarts += 1;
      position = contentLower.indexOf(variant, position + variant.length);
    }

    if (count === 0) continue;

    const frequency = Math.min(6, Math.log2(1 + count) * 2);
    const positionBonus = first < 800 ? 2 : first < 4000 ? 1 : 0;
    const boundaryBonus = wordStarts > 0 ? 2 : 0;
    const score = 2 + frequency + positionBonus + boundaryBonus;

    if (score > best.score) best = { score, index: first };
  }

  return best;
}

interface TermHit {
  score: number;
  content: ContentHit;
}

function scoreTerm(doc: PreparedTool<SearchableTool>, term: string): TermHit {
  const variants = termVariants(term);

  let metaScore = bestFieldScore(doc.name, variants, NAME_WEIGHTS);
  if (doc.slug !== doc.name) {
    metaScore = Math.max(metaScore, bestFieldScore(doc.slug, variants, SLUG_WEIGHTS));
  }
  metaScore += bestFieldScore(doc.tagline, variants, TAGLINE_WEIGHTS);

  let tagScore = 0;
  for (const tag of doc.tags) {
    tagScore = Math.max(tagScore, bestFieldScore(tag, variants, TAG_WEIGHTS));
  }
  metaScore += tagScore;
  metaScore += bestFieldScore(doc.category, variants, CATEGORY_WEIGHTS);
  metaScore += bestFieldScore(doc.extras, variants, EXTRAS_WEIGHTS);

  const content = scoreContent(doc.contentLower, variants);
  return { score: metaScore + content.score, content };
}

function phraseScore(doc: PreparedTool<SearchableTool>, phrase: string): number {
  if (!phrase || !phrase.includes(' ') || phrase.length < 5) return 0;

  let score = 0;
  if (doc.name === phrase) score += 80;
  else if (doc.name.includes(phrase)) score += 30;
  if (doc.tagline.includes(phrase)) score += 12;
  if (doc.contentLower.includes(phrase)) score += 8;
  return score;
}

/**
 * Extract an excerpt around the first matching term. Reads from the original
 * (non-lowercased) content so the README's wording and casing are preserved.
 * The window is deliberately tighter before the match than after it so the
 * matched words survive the two-line clamp on narrow cards.
 */
export function buildSnippet(
  content: string,
  terms: readonly string[],
  radius = 90
): string | null {
  if (!content) return null;

  const lower = content.toLowerCase();
  let matchIndex = -1;
  let matchLength = 0;

  for (const term of terms) {
    const index = lower.indexOf(term);
    if (index !== -1 && (matchIndex === -1 || index < matchIndex)) {
      matchIndex = index;
      matchLength = term.length;
    }
  }

  if (matchIndex === -1) return null;

  let start = Math.max(0, matchIndex - Math.min(50, radius));
  let end = Math.min(content.length, matchIndex + matchLength + radius);

  if (start > 0) {
    const space = content.indexOf(' ', start);
    if (space !== -1 && space < matchIndex) start = space + 1;
  }
  if (end < content.length) {
    const space = content.lastIndexOf(' ', end);
    if (space > matchIndex + matchLength) end = space;
  }

  const excerpt = collapseWhitespace(content.slice(start, end));
  if (!excerpt) return null;

  return `${start > 0 ? '…' : ''}${excerpt}${end < content.length ? '…' : ''}`;
}

/** Levenshtein distance of at most one, including a single transposition. */
function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  const lengthA = a.length;
  const lengthB = b.length;
  if (Math.abs(lengthA - lengthB) > 1) return false;

  let index = 0;
  while (index < lengthA && index < lengthB && a[index] === b[index]) index += 1;

  if (lengthA === lengthB) {
    if (a.slice(index + 1) === b.slice(index + 1)) return true;
    // Adjacent transposition: "vecotr" -> "vector".
    return (
      a[index] === b[index + 1] &&
      a[index + 1] === b[index] &&
      a.slice(index + 2) === b.slice(index + 2)
    );
  }

  return lengthA > lengthB
    ? a.slice(index + 1) === b.slice(index)
    : a.slice(index) === b.slice(index + 1);
}

interface FuzzyWords {
  metadata: string[];
  content: string[];
}

const fuzzyWordCache = new WeakMap<object, FuzzyWords>();

function fuzzyWords(doc: PreparedTool<SearchableTool>): FuzzyWords {
  const cached = fuzzyWordCache.get(doc);
  if (cached) return cached;

  const metadata = new Set<string>();
  for (const text of [doc.name, doc.slug, doc.tagline, doc.category, doc.extras]) {
    for (const word of text.split(' ')) {
      if (word.length >= 4) metadata.add(word);
    }
  }
  for (const tag of doc.tags) {
    if (tag.length >= 4) metadata.add(tag);
  }

  const contentWords = new Set<string>();
  for (const word of doc.contentLower.split(' ')) {
    if (word.length < 4) continue;
    contentWords.add(word);
    if (contentWords.size >= 3000) break;
  }

  const words: FuzzyWords = {
    metadata: Array.from(metadata),
    content: Array.from(contentWords),
  };
  fuzzyWordCache.set(doc, words);
  return words;
}

function fuzzyTermScore(
  doc: PreparedTool<SearchableTool>,
  variants: readonly string[]
): number {
  const { metadata, content } = fuzzyWords(doc);

  for (const variant of variants) {
    if (variant.length < 4) continue;

    for (const word of metadata) {
      if (Math.abs(word.length - variant.length) <= 1 && withinOneEdit(word, variant)) {
        return 8;
      }
    }
    for (const word of content) {
      if (Math.abs(word.length - variant.length) <= 1 && withinOneEdit(word, variant)) {
        return 4;
      }
    }
  }
  return 0;
}

interface Hit<T extends SearchableTool> {
  doc: PreparedTool<T>;
  score: number;
  coverage: number;
  contentScore: number;
  metaScore: number;
}

const META_MATCH_THRESHOLD = 24;

/**
 * Rank projects for a query. Returns matches ordered best-first plus the mode
 * used, so the UI can explain relaxed or fuzzy results.
 */
export function rankTools<T extends SearchableTool>(
  docs: readonly PreparedTool<T>[],
  query: string
): SearchOutcome<T> {
  const terms = tokenizeQuery(query);
  const phrase = normalize(query);
  const variants = Array.from(
    new Set(terms.flatMap((term) => termVariants(term)))
  ).filter((term) => term.length >= 2);

  if (terms.length === 0) {
    return { matches: [], mode: 'all', terms: variants, phrase };
  }

  let hits: Hit<T>[] = [];

  for (const doc of docs) {
    let score = 0;
    let coverage = 0;
    let contentScore = 0;

    for (const term of terms) {
      const hit = scoreTerm(doc, term);
      if (hit.score <= 0) continue;
      coverage += 1;
      score += hit.score;
      contentScore += hit.content.score;
    }

    if (coverage === 0) continue;

    const metaScore = score - contentScore;
    hits.push({
      doc,
      score: score + phraseScore(doc, phrase),
      coverage,
      contentScore,
      metaScore,
    });
  }

  let mode: SearchMode = 'all';

  if (hits.length > 0) {
    const exact = hits.filter((hit) => hit.coverage === terms.length);
    if (exact.length === 0) {
      mode = 'any';
    } else {
      hits = exact;
    }
  } else {
    mode = 'fuzzy';
    for (const doc of docs) {
      let score = 0;
      let coverage = 0;
      for (const term of terms) {
        const fuzzy = fuzzyTermScore(doc, termVariants(term));
        if (fuzzy > 0) {
          score += fuzzy;
          coverage += 1;
        }
      }
      if (coverage === 0) continue;
      hits.push({ doc, score, coverage, contentScore: 0, metaScore: 0 });
    }
  }

  hits.sort(
    (a, b) =>
      b.score - a.score ||
      b.coverage - a.coverage ||
      a.doc.tool.name.localeCompare(b.doc.tool.name)
  );

  const matches: ToolMatch<T>[] = hits.map((hit) => ({
    tool: hit.doc.tool,
    score: hit.score,
    // Name and tagline matches are already visible on the card, so only pull
    // an excerpt when the README is doing the work.
    snippet:
      mode === 'fuzzy' || hit.contentScore === 0 || hit.metaScore >= META_MATCH_THRESHOLD
        ? null
        : buildSnippet(hit.doc.content, variants),
  }));

  return { matches, mode, terms: variants, phrase };
}
