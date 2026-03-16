# Next.js Best Practices

> Builtin skill from persistent — covers App Router patterns (Next.js 13+)

## Patterns
- Use App Router (`app/` directory) for new projects — Pages Router is legacy
- Prefer Server Components by default — only add `"use client"` when needed (event handlers, hooks, browser APIs)
- Use `loading.tsx` for Suspense boundaries and `error.tsx` for error boundaries
- Data fetching: use `async` Server Components with direct DB/API calls — no useEffect for server data
- Mutations: use Server Actions (`"use server"`) instead of API routes for form submissions
- Use `next/image` for all images — automatic optimization and lazy loading
- Use `next/link` for all internal navigation — automatic prefetching
- Metadata: export `metadata` object or `generateMetadata()` from page/layout files
- Route handlers (`route.ts`) for webhooks and external API endpoints only
- Use `middleware.ts` at project root for auth, redirects, and request rewriting

## Anti-Patterns
- Don't use `useEffect` to fetch data on mount — use Server Components instead
- Don't put `"use client"` on layouts or pages unless absolutely necessary
- Don't use `getServerSideProps` / `getStaticProps` — those are Pages Router patterns
- Don't create API routes just to fetch data for your own pages — call the DB directly in Server Components
- Don't use `window` or `document` in Server Components — they run on the server

## Key Files
- `app/layout.tsx` — root layout, wraps all pages
- `app/page.tsx` — home page
- `middleware.ts` — runs before every request
- `next.config.js` — framework configuration
