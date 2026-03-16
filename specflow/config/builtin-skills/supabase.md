# Supabase Best Practices

> Builtin skill from persistent — covers Supabase client, RLS, and migrations

## Patterns
- Always enable Row Level Security (RLS) on every table — no exceptions
- Write RLS policies that use `auth.uid()` to scope data to the authenticated user
- Use `supabase/migrations/` for schema changes — never modify production DB directly
- Use the typed client: generate types with `supabase gen types typescript`
- Use `@supabase/ssr` for server-side auth in Next.js/SvelteKit (not `@supabase/auth-helpers`)
- Use Supabase Auth for authentication — don't roll your own
- Use Edge Functions for server-side logic that needs Supabase context
- Use `supabase db reset` to reset local DB during development
- Use storage buckets with RLS policies for file uploads
- Use realtime subscriptions sparingly — they consume connections

## Anti-Patterns
- Never bypass RLS with service_role key in client-side code
- Don't expose the service_role key to the browser — only use anon key client-side
- Don't write migrations by hand — use `supabase db diff` to generate them
- Don't use `supabase.auth.getSession()` in Server Components — use `supabase.auth.getUser()` instead (getSession reads from cookies which can be tampered)
- Don't create tables without RLS enabled
- Don't store sensitive data without encryption

## Key Files
- `supabase/config.toml` — local Supabase config
- `supabase/migrations/` — SQL migration files
- `supabase/seed.sql` — seed data for local dev
