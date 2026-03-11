# clerk/auth-patterns

## setup (next.js app router)
- Wrap root layout with `<ClerkProvider>`
- Middleware: `clerkMiddleware()` in `middleware.ts`, protect routes with `createRouteMatcher`
- Never use `authMiddleware` — deprecated

## protecting routes
```ts
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
const isProtected = createRouteMatcher(['/dashboard(.*)', '/api/(.*)'])
export default clerkMiddleware((auth, req) => {
  if (isProtected(req)) auth().protect()
})
```

## getting user server-side
```ts
// Server Component
import { auth, currentUser } from '@clerk/nextjs/server'
const { userId } = auth()           // fast — just the id
const user = await currentUser()    // full user object — use sparingly
```

## getting user client-side
```ts
import { useUser, useAuth } from '@clerk/nextjs'
const { user, isLoaded } = useUser()
const { userId, getToken } = useAuth()
```

## passing clerk userId to database
- Store `auth().userId` as `user_id` in your DB rows
- For Supabase RLS: pass clerk JWT via `supabaseClient.auth.setSession` or use Clerk's Supabase integration template
- Never trust user-supplied userId — always get from `auth()`

## webhooks
- Use `svix` to verify webhook signatures
- Handle `user.created`, `user.updated`, `user.deleted` to sync your DB
- Endpoint must be public (excluded from clerkMiddleware protection)

## anti-patterns
- No `getAuth()` in client components — use `useAuth()`
- No manual JWT parsing — use Clerk's helpers
- No storing sensitive user data from Clerk in your own DB unnecessarily
