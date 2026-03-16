# Clerk Auth Best Practices

> Builtin skill from persistent — covers Clerk authentication patterns

## Patterns
- Use `clerkMiddleware()` in `middleware.ts` to protect routes
- Use `auth()` in Server Components to get the current user
- Use `currentUser()` when you need full user profile data server-side
- Use `useUser()` / `useAuth()` hooks in Client Components
- Sync Clerk users to your database via webhooks (`user.created`, `user.updated`)
- Use Clerk's `<SignIn />` and `<SignUp />` components — don't build custom auth forms
- Configure `publicRoutes` in middleware for pages that don't need auth
- Use Clerk organizations for multi-tenant apps
- Store Clerk `userId` as the foreign key in your database tables

## Anti-Patterns
- Don't store passwords or auth tokens — Clerk handles all auth
- Don't check auth in individual page components — use middleware
- Don't call Clerk API from client-side — use server-side helpers
- Don't skip webhook verification — always verify Clerk webhook signatures
- Don't use `getAuth()` in App Router — use `auth()` instead
