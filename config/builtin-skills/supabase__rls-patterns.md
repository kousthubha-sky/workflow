# supabase/rls-patterns

## rls setup
- Enable RLS on every table — `alter table <t> enable row level security`
- Never rely on application-layer auth checks alone
- Default-deny: no policy = no access (even for service role via client)
- Test policies with `set role authenticated; set request.jwt.claims ...`

## policy patterns
```sql
-- Owner read/write
create policy "owner" on items
  for all using (auth.uid() = user_id);

-- Public read, owner write
create policy "public read" on posts
  for select using (true);
create policy "owner write" on posts
  for all using (auth.uid() = user_id);

-- Role-based (custom claim)
create policy "admin only" on settings
  for all using (auth.jwt() ->> 'role' = 'admin');
```

## client usage
- Use `@supabase/ssr` (not `@supabase/auth-helpers-nextjs`) for App Router
- Server Component client: `createServerClient` with cookie store from `cookies()`
- Route Handler / Server Action client: same — never use browser client server-side
- Browser client: `createBrowserClient` — singleton pattern

## common mistakes
- Forgetting `with check` on insert/update policies (using = read filter, with check = write filter)
- Using service role key client-side — only use `anon` key in browser
- Not enabling RLS after creating table — add to migration immediately
- Querying without selecting specific columns — always specify columns needed

## migrations
- All schema changes via migration files — never use Supabase dashboard for schema in production
- Filename: `YYYYMMDDHHMMSS_description.sql`
- Include RLS + policies in same migration as table creation
