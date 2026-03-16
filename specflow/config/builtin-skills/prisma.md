# Prisma Best Practices

> Builtin skill from persistent — covers Prisma ORM patterns

## Patterns
- Define all models in `prisma/schema.prisma` — single source of truth for DB schema
- Use `prisma generate` after schema changes to update the client
- Use `prisma migrate dev` for development, `prisma migrate deploy` for production
- Always use typed Prisma client for queries — never write raw SQL unless absolutely necessary
- Use `include` and `select` to control query shape — avoid over-fetching
- Use transactions (`prisma.$transaction`) for multi-step writes
- Create a singleton Prisma client instance — don't instantiate per request
- Use `@unique` and `@@unique` constraints in schema for business logic invariants
- Use `@relation` with explicit foreign key fields for clarity
- Use `Decimal` type for money/currency fields, never `Float`

## Anti-Patterns
- Don't manually edit migration files after they're created
- Don't use `prisma db push` in production — use migrations
- Don't create multiple PrismaClient instances (causes connection pool exhaustion)
- Don't use `findFirst` when you mean `findUnique` — it skips the unique index
- Don't store JSON blobs when structured relations would work better
- Don't skip `@updatedAt` on models that track modification time

## Singleton Pattern
```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client'
const globalForPrisma = globalThis as { prisma?: PrismaClient }
export const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```
