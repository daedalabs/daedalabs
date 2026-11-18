/**
 * Convert README Markdown into plain text for the search index.
 *
 * Code fences are dropped: install snippets and shell examples repeat across
 * every project and would drown out the prose a visitor is actually searching
 * for. Everything else - headings, prose, list items, table cells, image alt
 * text, and link labels - is kept.
 */
export const MAX_SEARCH_TEXT_CHARS = 12_000;

export function readmeToSearchText(
  markdown: string,
  maxLength: number = MAX_SEARCH_TEXT_CHARS
): string {
  if (!markdown) return '';

  const text = markdown
    .replace(/\r\n?/g, '\n')
    // HTML comments
    .replace(/<!--[\s\S]*?-->/g, ' ')
    // Fenced code blocks
    .replace(/~~~[\s\S]*?~~~/g, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    // Standalone reference definitions and reference-style links
    .replace(/^\s*\[[^\]]+\]:\s*\S+.*$/gm, ' ')
    .replace(/\[([^\]]*)\]\[[^\]]*\]/g, ' $1 ')
    // Inline images keep their alt text, links keep their label
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, ' $1 ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, ' $1 ')
    // Raw HTML tags (the inner text is preserved)
    .replace(/<[^>]+>/g, ' ')
    // Heading markers, blockquote markers, and list bullets
    .replace(/^\s{0,3}#{1,6}\s+/gm, ' ')
    .replace(/^\s{0,3}>\s?/gm, ' ')
    .replace(/^\s*[-*+]\s+/gm, ' ')
    .replace(/^\s*\d+[.)]\s+/gm, ' ')
    // Horizontal rules and table separators
    .replace(/^\s*([-*_])\1{2,}\s*$/gm, ' ')
    .replace(/^\s*\|?[\s:|-]+\|[\s:|-]*$/gm, ' ')
    // Table cell pipes
    .replace(/\|/g, ' ')
    // Bare URLs and leftover Markdown emphasis/code markers
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[*_~`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length <= maxLength) return text;

  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > maxLength * 0.8 ? truncated.slice(0, lastSpace) : truncated).trim();
}
