# daedalabs.org

The directory website for the [daedalabs](https://github.com/daedalabs) GitHub organization.

Built with Next.js 16, Tailwind CSS, and GitHub API sync.

## Overview

Daedalabs is a personal GitHub organization by [@juhenes](https://github.com/juhenes) for side projects, CLI utilities, and systems built from scratch.

This repository runs the public site at [daedalabs.org](https://daedalabs.org). It indexes public repositories under `@daedalabs`, renders project READMEs, and provides search and category filters.

## Local development

```bash
npm install
npm run dev
```

The site runs at `http://localhost:3000`.

## Architecture

- `src/lib/github.ts`: Queries the GitHub API for organization repositories and reads raw READMEs.
- `src/lib/tools.ts`: Unifies GitHub repositories and optional local entries.
- `src/app/page.tsx`: Homepage with category and status filters.
- `src/app/tools/[slug]/page.tsx`: Detail page rendering the project's README.
- `src/app/api/webhook/github/route.ts`: Optional webhook to revalidate the cache when repos change.

## Deployment

Deploy on Vercel with standard Next.js settings:

1. Import the repository in Vercel.
2. In Cloudflare DNS, add an A record pointing to `76.76.21.21` (DNS only).
3. Connect the domain in Vercel project settings.

## License

MIT © [juhenes](https://github.com/juhenes)
