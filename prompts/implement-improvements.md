# Implementation prompt: harden and finish daedalabs.tech

You are a senior full-stack engineer working in the `daedalabs` repository: a Next.js 16 App Router site that indexes public GitHub repositories from the `daedalabs` organization, renders their READMEs, and provides search, category, sort, and view controls. React 19, Tailwind CSS 4, TypeScript, oxlint, Prettier, Playwright. No database, no CMS, no auth.

Your job is to implement the three required workstreams below, in order, then optionally the follow-ups. Work directly in the repository. Make focused commits or leave the tree clean, but do not commit unless explicitly asked.

## Read before writing code

1. `AGENTS.md` at the repo root. This is **not** the Next.js you may know. Read the relevant guides under `node_modules/next/dist/docs/` before touching Next-specific APIs (`use cache`, `cacheLife`, `cacheTag`, `revalidateTag`, route segment config, intercepting routes, `cacheComponents`).
2. These files, in full:
   - `src/lib/github.ts`, `src/lib/tools.ts`, `src/lib/site.ts`
   - `src/app/page.tsx`, `src/app/tools/[slug]/page.tsx`
   - `src/components/ToolsExplorer.tsx`, `src/components/ToolModal.tsx`, `src/components/ToolCard.tsx`
   - `src/app/api/tools/[slug]/route.ts`, `src/app/api/webhook/github/route.ts`
   - `tests/daedalabs.spec.ts`, `playwright.config.ts`
3. Run the baseline before changing anything:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test:e2e` (requires a production build and a running server; see `playwright.config.ts`)

On Windows, `npm.ps1` may be blocked by execution policy; use `npm.cmd` instead.

## Verified ground truth

Do not spend time re-investigating these; they were confirmed against the current tree:

- `oxlint` and `tsc --noEmit` pass on a clean checkout.
- `getAllTools` / `getToolDetail` call `micromark()` in plain CommonMark mode (`src/lib/tools.ts:46`). GFM tables, task lists, strikethrough, and bare-URL autolinks do **not** render. `.prose-dl table` styles exist in `globals.css` but are unreachable.
- `micromark` escapes raw HTML. READMEs that use `<p align="center">`, `<details>`, `<picture>`, or `<img>` render the tags as visible text. This is safe from XSS but visually broken.
- Relative README URLs are emitted untouched. `![x](./assets/x.png)` becomes `<img src="./assets/x.png">`, which resolves to `daedalabs.tech/assets/x.png` and 404s. Relative doc links break the same way.
- Category filtering exists in code but has no UI. `CATEGORIES` is only used to validate `?category=` and to label filters; there is no control that sets a category. The E2E suite currently asserts category pills are absent.
- The hero has search and a shuffle button only. The sort menu lives in the docked header, is `hidden sm:block`, and grid/list toggles only appear after scrolling. Mobile users cannot sort.
- `status` and `featured` are computed but never rendered. `hardware` exists in the `ToolItem` union and label map but not in `CATEGORIES`.
- `getOrgRepos` catches every error and returns `[]`. A GitHub outage or rate limit therefore renders the "No projects published yet" empty state and caches it for several minutes. Unauthenticated GitHub allows 60 requests/hour.
- `getToolDetail` paginates the entire organization to find one repository, then fetches the README through the rate-limited API.
- `/api/webhook/github` skips signature verification entirely when `GITHUB_WEBHOOK_SECRET` is unset, so anyone can purge the cache.
- The modal is a client-side fetch of `/api/tools/[slug]`. URL state uses `history.replaceState` only, so Back never closes the modal.

## Non-negotiable constraints

- Preserve the existing visual language: warm ink palette, hairline borders, mono micro-labels, 5xl container. Do not redesign. Do not add a component library.
- Keep the site fully static/ISR-friendly where it already is. Do not introduce a database, queue, or long-running service.
- **Never** pass untrusted README HTML to `dangerouslySetInnerHTML` without sanitizing it. Sanitization must run on the server, before caching.
- Keep every existing public URL and its canonical metadata working. Do not break `/tools/[slug]`, `/feed.xml`, `/sitemap.xml`, `/api/tools/[slug]`, or the webhook contract.
- Preserve SEO output and JSON-LD unless a change explicitly improves it.
- Accessibility is part of "done": keyboard operation, visible focus, reduced motion, no focus traps behind overlays.
- Do not delete or weaken tests just to get green. If behavior intentionally changes, update the test to assert the new behavior and say so in your summary.
- Keep dependencies minimal and justified. For the README pipeline, the expected set is `unified`, `remark-parse`, `remark-gfm`, `remark-rehype`, `rehype-raw`, `rehype-sanitize`, `rehype-stringify`. Do not add a syntax highlighter in this pass.
- Handle network failure explicitly. A failed GitHub request must never masquerade as "no projects".

## Phase 1 (required): a correct, safe README pipeline

Create `src/lib/markdown.ts` exporting a single function:

```ts
export function renderReadme(
  markdown: string,
  options: { org: string; repo: string }
): string;
```

It must:

1. Parse with `remark-parse` and enable GFM with `remark-gfm`. Tables, task lists, strikethrough, and autolinks must render.
2. Convert to rehype with `remark-rehype` (`allowDangerousHtml: true`) and parse embedded HTML with `rehype-raw`. Common README HTML (`<details>`, `<summary>`, `<picture>`, `<source>`, `<img>`, `<p align>`, `<br>`, `<kbd>`, `<sub>`, `<sup>`, `<div>`) must render as HTML, not literal text.
3. Remove the first top-level `h1` node from the mdast, if present, so the README does not duplicate the page's own title. Do this on the tree, not with a regex on HTML.
4. Rewrite relative URLs against the repository root:
   - Images -> `https://raw.githubusercontent.com/{org}/{repo}/HEAD/{path}`
   - Links -> `https://github.com/{org}/{repo}/blob/HEAD/{path}`
   - Handle `./`, `../`, leading `/`, query strings, and fragments. Leave absolute URLs, protocol-relative URLs, `mailto:`, and pure `#anchor` links alone.
   - Rewrite every candidate in `srcset`, not just `src`.
5. Sanitize with `rehype-sanitize` using an explicit allowlist. Allow common README elements (`a`, `p`, `div`, `span`, `img`, `picture`, `source`, `details`, `summary`, `h1`-`h6`, lists, `table`/`thead`/`tbody`/`tr`/`th`/`td`, `pre`, `code`, `blockquote`, `hr`, `br`, `del`, `ins`, `kbd`, `sub`, `sup`, `input` for task checkboxes). Allow only safe attributes (`href`, `src`, `srcset`, `alt`, `title`, `width`, `height`, `align`, `open`, `type`, `checked`, `disabled`). Allow only `http`, `https`, `mailto`, and fragment URLs. Strip `script`, `style`, event handlers, `iframe`, `object`, `embed`, and `javascript:` URLs.
6. Add `rel="noopener noreferrer nofollow"` and `target="_blank"` to external links. Do not add `target` to in-page anchors.
7. Return an HTML string. Keep the function pure and synchronous.

Wire it into `src/lib/tools.ts` for both `getToolDetail` and any README rendering path. Delete the direct `micromark` call and remove the now-unused dependency only if nothing else uses it.

Add `tests/markdown.spec.ts` that imports `renderReadme` directly and uses fixture strings. Cover at minimum:

- a GFM table produces `<table>`;
- `- [x] done` produces a checkbox input;
- `~~old~~` produces `<del>`;
- `<details><summary>x</summary>y</details>` survives as HTML;
- `<script>alert(1)</script>`, `<img src=x onerror=alert(1)>`, and `[x](javascript:alert(1))` are removed or neutralized;
- `![shot](./assets/demo.png)` and `[guide](docs/setup.md)` point at the expected GitHub URLs;
- `![shot](/assets/demo.png)` and `../img/x.png` resolve correctly;
- the leading `<h1>` is stripped but later headings remain.

Playwright can import TypeScript modules directly, so no new test runner is required.

Manual check: open a tool detail page and a modal for a repository whose README contains a table, a badge image, and an HTML block. Confirm the images load and the table renders.

## Phase 2 (required): GitHub failure must not empty the site

1. Change `getOrgRepos` to distinguish "org has no repos" from "fetch failed". Either throw a typed error or return a result object; do not collapse both to `[]`.
2. Add a checked-in last-known-good snapshot, `src/content/projects.snapshot.json`, containing the fields `getAllTools` needs (`slug`, `name`, `tagline`, `category`, `status`, `tags`, `githubUrl`, `demoUrl`, `featured`, `releaseDate`, `updatedAt`, `stargazersCount`, `forksCount`, `license`, `primaryLanguage`). When GitHub fails, serve the snapshot and set an `isStale` flag. Add a short comment or script that documents how to refresh the snapshot; do not require the script to run in production.
3. Surface the failure in the UI. `getAllTools` should return both tools and a status (`fresh | cached | unavailable`). Pass that to `ToolsExplorer`. When stale, show a quiet inline notice ("Showing the last successful sync. GitHub is temporarily unavailable.") instead of the "No projects published yet" empty state. Only show the true empty state when GitHub succeeds and returns zero repositories.
4. Fetch a single repository directly: `GET /repos/{org}/{repo}` for `getToolDetail` instead of paginating `/orgs/{org}/repos`.
5. Fetch README content from `raw.githubusercontent.com` when possible to avoid API quota. Keep `/HEAD/` so branch renames do not break it. Keep the existing tag-based cache behavior.
6. Wrap `getAllTools` and `getToolDetail` in React `cache()` to deduplicate work within a render (metadata, page, sitemap, feed, OG image all call them).
7. Require the webhook secret in production: if `NODE_ENV === 'production'` and `GITHUB_WEBHOOK_SECRET` is missing, return `503` with a clear error instead of accepting unauthenticated POSTs. Keep the current behavior in development only.
8. Document `GITHUB_TOKEN` as required for production in `README.md` / `.env.example`, with the rate-limit reason.

Acceptance:

- Simulating a GitHub failure (temporarily point the fetch at an unreachable host or throw in a test) still renders project cards from the snapshot plus the stale notice, not the empty state.
- A successful response with zero repos still renders the true empty state.
- A detail page loads with one repository request plus one README request, not one request per org page.

## Phase 3 (required): finish the discovery toolbar

1. Add a real toolbar to the hero, directly under or beside the search field, and keep a compact version in the docked header. It must contain:
   - a category control (select or chip row) populated from the categories actually present in the data, always including `all`;
   - the existing `SortMenu`;
   - the existing grid/list `ViewToggle`;
   - the existing random-project button.
2. Remove `hidden sm:block` from the sort control. At 390px width, all controls must be reachable and must not overflow horizontally. Use wrapping or a two-row layout.
3. Derive category options from `ToolsExplorer`'s tool list instead of hardcoding `CATEGORIES`, or extend `CATEGORIES` to include `hardware` and filter to categories with at least one tool. Keep `?category=` working.
4. Use the existing `status` field: show an "archived" marker on cards, the table row, and the detail page. Either show `featured` as a pinned/featured marker or stop sorting by it; do not leave it invisible.
5. Keep URL state shareable. Add a `popstate` listener so Back/Forward updates search, category, sort, view, and the open modal. Keep search input responsive; do not push a history entry per keystroke.
6. Update `tests/daedalabs.spec.ts`:
   - remove the assertions that category pills and status badges must not exist;
   - add an interaction test that selects a category and asserts the result count/list changes;
   - add a 390px viewport test that sort and view controls are visible and usable;
   - keep the `?category=byox` test and make it assert real filtering, not just a badge.
7. Avoid layout shift and keep the existing typography. The toolbar should look native to the current design.

## Phase 4 (optional, only after 1-3 are green): simplify scrolling and harden accessibility

The current `ToolsExplorer` contains ~250 lines of wheel/touch scroll hijacking with `preventDefault()` and auto-snapping (`src/components/ToolsExplorer.tsx:258-504`). Replace it with native scrolling:

- remove the wheel, touch, and `scrollend` listeners and the snap animation;
- keep the sticky hero and catalog overlap if the visual result still works, but let normal scrolling control position;
- honor `prefers-reduced-motion` for the hero scale/fade and the theme cross-fade;
- update the "mouse scroll wheel navigates" E2E test to assert ordinary scrolling instead of snapping.

Also:

- make the modal inert-safe: use a native `<dialog>` or set `inert` on the page content while it is open, keep Escape and focus restoration, and keep background scroll locked;
- add a visually-hidden `h2` for the projects section;
- add a skip link if it can be done without disturbing the hero.

Do not half-implement this phase. If the scroll refactor risks the layout, stop and report rather than shipping a broken hero.

## Phase 5 (optional, separate change): make the modal a route

Replace the client fetch with an intercepting route (`app/@modal/(.)tools/[slug]/page.tsx`) so the modal is server-rendered, deep-linkable, and Back-button aware. Reuse the Phase 1 renderer and the detail page's data loading. Remove the `?tool=` fetch path and `/api/tools/[slug]` if it becomes unused. This is a larger architectural change; do not start it until Phases 1-3 pass.

## Verification (required before you report back)

Run and report the exact result of:

```bash
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

Then perform a manual smoke test at desktop and 390px width:

1. Home loads, hero renders, footer is visible.
2. Search, category, sort, and view controls all work and survive a reload via URL.
3. Open a project modal, close with Escape, and confirm focus returns to the trigger.
4. Open a project detail page whose README has a table, an image, and task list.
5. Confirm no broken relative images or links in rendered READMEs.
6. Simulate GitHub failure and confirm the stale notice plus snapshot cards.
7. Toggle light/dark and reload; the choice persists with no flash.
8. Check the browser console for hydration and runtime errors.

## Out of scope

- Visual redesign, new fonts, new color system.
- A CMS or local Markdown authoring pipeline.
- Syntax highlighting, search indexing services, analytics, or comment systems.
- Unrelated dependency upgrades.
- Rewriting the SEO layer unless a change above requires it.

## Report format

When done, return:

1. A short summary of what changed and why.
2. Files added/modified.
3. The exact verification commands and their outcomes.
4. Any behavior or test you intentionally changed, and the reason.
5. Remaining risks or follow-ups, including anything you skipped from Phases 4-5.
