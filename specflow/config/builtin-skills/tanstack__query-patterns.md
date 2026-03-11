# tanstack/query-patterns

## setup
```tsx
// providers.tsx (Client Component)
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } }
})
export function Providers({ children }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
```

## query keys — always structured arrays
```ts
// keys.ts — centralize all query keys
export const keys = {
  users: {
    all:    () => ['users'] as const,
    detail: (id: string) => ['users', id] as const,
    list:   (filters: Filters) => ['users', 'list', filters] as const,
  },
  posts: {
    all:    () => ['posts'] as const,
    byUser: (userId: string) => ['posts', 'byUser', userId] as const,
  },
}
```

## useQuery
```ts
const { data, isPending, isError, error } = useQuery({
  queryKey: keys.users.detail(userId),
  queryFn: () => fetchUser(userId),
  enabled: !!userId,           // don't run if no userId
  staleTime: 5 * 60_000,       // 5 min — override default
})
```

## useMutation
```ts
const mutation = useMutation({
  mutationFn: (data: CreateUserInput) => createUser(data),
  onSuccess: (newUser) => {
    // Invalidate related queries
    queryClient.invalidateQueries({ queryKey: keys.users.all() })
    // Or optimistically update
    queryClient.setQueryData(keys.users.detail(newUser.id), newUser)
  },
  onError: (error) => toast.error(error.message),
})
// call: mutation.mutate(data) or mutation.mutateAsync(data)
```

## with next.js app router
- Use React Query for client-side data that changes (user-specific, real-time)
- Use Server Components + fetch for static/semi-static data
- Prefetch on server: `queryClient.prefetchQuery(...)` + `<HydrationBoundary>`

## anti-patterns
- String query keys: `['user']` not `'user'`
- Not centralizing keys — leads to stale cache bugs
- Using React Query for server-only data in Next.js App Router
- Fetching in `useEffect` instead of `useQuery`
