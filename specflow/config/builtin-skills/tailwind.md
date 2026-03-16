# Tailwind CSS Best Practices

> Builtin skill from persistent — covers Tailwind CSS v3+ patterns

## Patterns
- Use utility classes directly in markup — don't create custom CSS unless absolutely necessary
- Use `@apply` sparingly — only for base styles that repeat identically in many places
- Use the `cn()` helper (clsx + tailwind-merge) for conditional class composition
- Use design tokens via `tailwind.config` — don't hardcode colors or spacing
- Use responsive prefixes (`sm:`, `md:`, `lg:`) — mobile-first approach
- Use `dark:` variant for dark mode support
- Group related utilities: layout → spacing → sizing → typography → colors → effects
- Use `container` with `mx-auto` for centered page layouts
- Use CSS Grid (`grid`) for 2D layouts, Flexbox (`flex`) for 1D layouts

## Anti-Patterns
- Don't mix Tailwind with CSS modules or styled-components in the same project
- Don't use inline `style={{}}` when a Tailwind utility exists
- Don't create utility classes that duplicate Tailwind defaults
- Don't use `!important` — restructure component hierarchy instead
- Don't hardcode pixel values — use Tailwind's spacing scale (p-4, m-2, etc.)
