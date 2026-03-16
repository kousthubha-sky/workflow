# React Best Practices

> Builtin skill from persistent — covers React 18+ patterns

## Patterns
- Use functional components with hooks — no class components
- Use `useState` for local state, `useReducer` for complex state logic
- Memoize expensive computations with `useMemo`, callbacks with `useCallback`
- Use `React.lazy()` + `Suspense` for code splitting
- Keep components small and focused — extract when a component exceeds ~100 lines
- Lift state up to the nearest common ancestor, not higher
- Use custom hooks to extract reusable logic from components
- Prefer controlled components for forms
- Use `key` prop correctly on lists — never use array index for dynamic lists
- Use `ErrorBoundary` components to catch rendering errors

## Anti-Patterns
- Don't mutate state directly — always use setter functions
- Don't use `useEffect` for derived state — compute it during render instead
- Don't create new objects/arrays in render without memoization when passed as props
- Don't ignore the dependency array in `useEffect` / `useMemo` / `useCallback`
- Don't use `useEffect` for event handling — use event handlers directly
- Don't nest ternaries in JSX — extract to variables or components
