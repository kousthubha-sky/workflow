# vercel/nextjs-best-practices

## routing
- Use App Router (`app/`) exclusively — no Pages Router mixing
- Layouts at `app/layout.tsx`, page-level layouts as nested `layout.tsx`
- Loading states via `loading.tsx`, error boundaries via `error.tsx`
- Route groups `(group)/` to share layouts without affecting URL

## data fetching
- Server Components fetch directly — no useEffect, no SWR/React Query for server data
- `fetch()` with `{ cache: 'force-cache' }` for static, `{ next: { revalidate: N } }` for ISR
- `{ cache: 'no-store' }` for dynamic — not `dynamic = 'force-dynamic'` unless needed
- Parallel fetching: `await Promise.all([fetch(a), fetch(b)])` in Server Components

## server actions
- Prefer Server Actions over API routes for mutations
- Always validate input with zod before any DB call
- Return `{ error: string } | { data: T }` — never throw from actions
- Mark files with `'use server'` at top, not individual functions

## components
- Default to Server Components — add `'use client'` only when needed (event handlers, hooks, browser APIs)
- Keep Client Components small — push them to leaves of the tree
- Colocate page-specific components in `_components/` inside the route folder

## performance
- `next/image` for all images — always set width/height or fill + sizes
- `next/font` for all fonts — preloads automatically
- `next/dynamic` with `{ ssr: false }` for heavy client-only libs
- Avoid large barrel imports — import directly from source

## anti-patterns
- No `useEffect` for data fetching
- No API routes for mutations that Server Actions can handle
- No `any` types
- No `export default` on Server Actions files
