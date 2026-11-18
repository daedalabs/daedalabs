import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, {
  defaultSchema,
  type Options as SanitizeOptions,
} from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';

export interface RenderReadmeOptions {
  org: string;
  repo: string;
}

/**
 * Custom remark plugin to remove the first top-level h1 heading from the mdast
 * so that the rendered README does not duplicate the page title.
 */
function remarkRemoveFirstH1() {
  return (tree: { children?: Array<{ type: string; depth?: number }> }) => {
    if (tree && Array.isArray(tree.children)) {
      const index = tree.children.findIndex(
        (child) => child.type === 'heading' && child.depth === 1
      );
      if (index !== -1) {
        tree.children.splice(index, 1);
      }
    }
  };
}

function isExternalOrProtocol(url: string): boolean {
  return url.startsWith('#') || /^(?:[a-zA-Z][a-zA-Z0-9+.-]*:|\/\/)/.test(url);
}

function resolveRepoPath(url: string): { path: string; search: string; hash: string } {
  const dummyBase = 'https://repo.root/';
  const parsed = new URL(url, dummyBase);
  const cleanPath = parsed.pathname.replace(/^\/+/, '');
  return {
    path: cleanPath,
    search: parsed.search,
    hash: parsed.hash,
  };
}

function rewriteLinkUrl(url: string, org: string, repo: string): string {
  if (!url || isExternalOrProtocol(url)) {
    return url;
  }
  const { path, search, hash } = resolveRepoPath(url);
  return `https://github.com/${org}/${repo}/blob/HEAD/${path}${search}${hash}`;
}

function rewriteImageUrl(url: string, org: string, repo: string): string {
  if (!url || isExternalOrProtocol(url)) {
    return url;
  }
  const { path, search, hash } = resolveRepoPath(url);
  return `https://raw.githubusercontent.com/${org}/${repo}/HEAD/${path}${search}${hash}`;
}

function rewriteSrcset(srcset: string, org: string, repo: string): string {
  return srcset
    .split(',')
    .map((candidate) => {
      const trimmed = candidate.trim();
      if (!trimmed) return trimmed;
      const parts = trimmed.split(/\s+/);
      const url = parts[0];
      const descriptor = parts.slice(1).join(' ');
      const rewritten = rewriteImageUrl(url, org, repo);
      return descriptor ? `${rewritten} ${descriptor}` : rewritten;
    })
    .join(', ');
}

interface HastElement {
  type: string;
  tagName: string;
  properties?: Record<string, unknown>;
  children?: HastElement[];
}

function rehypeRewriteUrls(options: RenderReadmeOptions) {
  return (tree: HastElement) => {
    function visit(node: HastElement) {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'element') {
        if (node.tagName === 'a') {
          const href = node.properties?.href;
          if (typeof href === 'string') {
            const rewritten = rewriteLinkUrl(href, options.org, options.repo);
            node.properties = node.properties || {};
            node.properties.href = rewritten;
            if (!href.startsWith('#') && !/^\s*javascript:/i.test(href)) {
              node.properties.target = '_blank';
              node.properties.rel = 'noopener noreferrer nofollow';
            }
          }
        } else if (node.tagName === 'img' || node.tagName === 'source') {
          if (typeof node.properties?.src === 'string') {
            node.properties.src = rewriteImageUrl(
              node.properties.src,
              options.org,
              options.repo
            );
          }
          if (typeof node.properties?.srcset === 'string') {
            node.properties.srcset = rewriteSrcset(
              node.properties.srcset,
              options.org,
              options.repo
            );
          }
          if (typeof node.properties?.srcSet === 'string') {
            node.properties.srcSet = rewriteSrcset(
              node.properties.srcSet,
              options.org,
              options.repo
            );
          }
        }
      }
      if (Array.isArray(node.children)) {
        for (const child of node.children) {
          visit(child);
        }
      }
    }
    visit(tree);
  };
}

const sanitizeSchema: SanitizeOptions = {
  ...defaultSchema,
  tagNames: [
    'a',
    'p',
    'div',
    'span',
    'img',
    'picture',
    'source',
    'details',
    'summary',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'ul',
    'ol',
    'li',
    'table',
    'thead',
    'tbody',
    'tfoot',
    'tr',
    'th',
    'td',
    'pre',
    'code',
    'blockquote',
    'hr',
    'br',
    'del',
    'ins',
    'kbd',
    'sub',
    'sup',
    'input',
    'b',
    'strong',
    'i',
    'em',
    's',
    'strike',
  ],
  attributes: {
    ...defaultSchema.attributes,
    a: ['href', 'target', 'rel', 'title', 'ariaLabel'],
    img: ['src', 'srcset', 'srcSet', 'alt', 'title', 'width', 'height', 'align'],
    source: ['src', 'srcset', 'srcSet', 'type', 'media'],
    details: ['open'],
    summary: [],
    div: ['align', 'className'],
    p: ['align', 'className'],
    span: ['className'],
    h1: ['align'],
    h2: ['align'],
    h3: ['align'],
    h4: ['align'],
    h5: ['align'],
    h6: ['align'],
    table: ['align'],
    th: ['align'],
    td: ['align'],
    input: [['disabled', true], ['type', 'checkbox'], 'checked'],
    code: ['className'],
    pre: ['className'],
    li: ['className'],
    ul: ['className'],
    ol: ['className'],
    '*': ['title', 'alt', 'width', 'height', 'align'],
  },
  protocols: {
    href: ['http', 'https', 'mailto'],
    src: ['http', 'https'],
  },
  strip: ['script', 'style', 'iframe', 'object', 'embed'],
};

export function renderReadme(
  markdown: string,
  options: { org: string; repo: string }
): string {
  const file = unified()
    .use(remarkParse)
    .use(remarkGfm)
    // @ts-expect-error unified plugin type signature mismatch with custom remark plugin
    .use(remarkRemoveFirstH1)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeRewriteUrls, options)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeStringify)
    .processSync(markdown);

  return String(file);
}
