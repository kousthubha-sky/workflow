# shadcn/ui Best Practices

> Builtin skill from persistent — covers shadcn/ui component patterns

## Patterns
- Components are copied into your project (`components/ui/`) — you own and customize them
- Use `npx shadcn@latest add <component>` to add new components
- Compose complex UIs from primitive shadcn components — don't create from scratch
- Use the `cn()` utility (from `lib/utils.ts`) for merging Tailwind classes
- Follow the component file convention: `components/ui/<name>.tsx` for primitives
- Use `cva` (class-variance-authority) for component variants
- Wrap shadcn components in your own components for app-specific defaults
- Use shadcn's form components with `react-hook-form` + `zod` for form validation

## Anti-Patterns
- Don't modify `components/ui/` files directly for app logic — wrap them instead
- Don't install Radix primitives separately — shadcn already wraps them
- Don't use custom CSS for component styling — use Tailwind utilities
- Don't create duplicate components when shadcn has one available
- Don't skip the `cn()` utility — it handles Tailwind class conflicts correctly
