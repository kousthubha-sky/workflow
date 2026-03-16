# Drizzle ORM Best Practices

> Builtin skill from persistent — covers Drizzle ORM patterns

## Patterns
- Define schema in TypeScript files — Drizzle infers types from schema definitions
- Use `drizzle-kit` for migrations: `drizzle-kit generate` then `drizzle-kit migrate`
- Use the query builder for type-safe queries — avoid raw SQL
- Use `drizzle-zod` to generate Zod schemas from your Drizzle tables
- Use transactions for multi-step writes: `db.transaction(async (tx) => { ... })`
- Use `$inferSelect` and `$inferInsert` to derive TypeScript types from tables
- Use prepared statements for frequently executed queries
- Use `relations()` to define table relationships for the relational query API

## Anti-Patterns
- Don't manually write migration SQL — let drizzle-kit generate it
- Don't use string concatenation in queries — use the query builder to prevent SQL injection
- Don't skip the migration step — always run migrations in production
- Don't mix Drizzle with raw `pg` or `mysql2` queries in the same codebase
