# daedalabs.tech

The directory website for the [daedalabs](https://github.com/daedalabs) GitHub organization.

Built with Next.js 16, Tailwind CSS, and GitHub API sync.

## Overview

Daedalabs is a personal GitHub organization by [@juhenes](https://github.com/juhenes) for side projects, CLI utilities, and systems built from scratch.

This repository runs the public site at [daedalabs.tech](https://daedalabs.tech). It indexes public repositories under `@daedalabs`, renders project READMEs, and provides search and category filters.

## Local development

```bash
npm install
npm run dev
```

The site runs at `http://localhost:3000`.

## Architecture

- `src/lib/github.ts`: Queries the GitHub API for organization repositories and reads raw READMEs.
- `src/lib/tools.ts`: Unifies GitHub repositories, fallback snapshots, and metadata.
- `src/lib/search.ts`: Field-weighted catalog search with stemming, multi-word relaxation, typo tolerance, and README excerpts.
- `src/lib/readme-text.ts`: Converts README Markdown into plain text for the search index.
- `src/lib/search-index.ts`: Builds the README index behind `/api/search-index`.
- `src/lib/markdown.ts`: Pure, sanitized Markdown/GFM renderer with relative asset resolution and XSS protection.
- `src/content/projects.snapshot.json`: Checked-in last-known-good fallback snapshot for resilience during GitHub API outages or rate limits.
- `src/app/page.tsx`: Homepage with category discovery, sort, view toggles, and search.
- `src/app/tools/[slug]/page.tsx`: Detail page rendering the project's README.
- `src/app/api/webhook/github/route.ts`: Webhook to revalidate the cache when repos change.

## Search

Search covers more than names: project taglines, tags, categories, and the plain
text of every README are searchable, so queries like "something that turns
videos into gifs" can find the right project.

- `src/app/api/search-index/route.ts` returns plain-text README content with code
  fences stripped, truncated to 12,000 characters per project, and revalidated
  on the same 5 minute window as the detail pages.
- The explorer fetches that index on the first focus or keystroke and keeps it
  in memory for the rest of the session, so filtering stays instant.
- Ranking favours name matches over taglines, tags, and README text. Multi-word
  queries are matched as AND and relax to OR, common suffixes are stemmed
  (`editing` → `edit`), and a one-edit typo fallback runs when nothing matches.
- When the match comes from documentation, the card shows a short highlighted
  README excerpt explaining why it matched.
- No search service or extra environment variable is required. If GitHub is
  unavailable, the index is empty and search falls back to metadata.

## Environment Variables

- `GITHUB_TOKEN` (**Required in production**): A GitHub Personal Access Token (classic or fine-grained with read access to public repos). Without a token, GitHub limits unauthenticated requests to 60/hour, which can cause rate-limit failures during Next.js ISR builds and revalidations. With a token, the limit increases to 5,000/hour.
- `GITHUB_WEBHOOK_SECRET` (**Required in production**): Secret key configured on the GitHub organization webhook to cryptographically verify incoming payload signatures (HMAC SHA-256) before purging ISR cache tags.
- `GITHUB_ORG` (Optional): GitHub organization name (defaults to `daedalabs`).
- `NEXT_PUBLIC_SITE_URL` (Optional): Public site URL (defaults to `https://daedalabs.tech`).

## Deployment

Deploy on Vercel with standard Next.js settings:

1. Import the repository in Vercel.
2. In Cloudflare DNS, add an A record pointing to `76.76.21.21` (DNS only).
3. Connect the domain in Vercel project settings.

## License

MIT © [juhenes](https://github.com/juhenes)
