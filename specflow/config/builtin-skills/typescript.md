# TypeScript Best Practices

> Builtin skill from persistent — covers TypeScript patterns for any project

## Patterns
- Enable `strict: true` in tsconfig.json — catches bugs at compile time
- Use type inference where possible — don't annotate what TypeScript can infer
- Use `interface` for object shapes, `type` for unions/intersections/mapped types
- Use discriminated unions for state machines and tagged data
- Use `as const` for literal types and readonly arrays
- Use `satisfies` operator to validate types without widening
- Use `unknown` instead of `any` — then narrow with type guards
- Use `Record<K, V>` for dictionaries, not `{ [key: string]: V }`
- Export types alongside their implementations
- Use path aliases (`@/lib/...`) configured in tsconfig.json

## Anti-Patterns
- Don't use `any` — use `unknown` and narrow, or define a proper type
- Don't use `as` type assertions unless you've verified the type at runtime
- Don't use `!` (non-null assertion) — handle null/undefined explicitly
- Don't use `enum` — use `as const` objects or union types instead
- Don't suppress errors with `@ts-ignore` — use `@ts-expect-error` with explanation if truly needed
- Don't create god types — keep interfaces focused and composable
