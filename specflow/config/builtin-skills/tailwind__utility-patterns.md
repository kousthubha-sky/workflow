# tailwind/utility-patterns

## class organization order
1. Layout: `flex grid block hidden`
2. Position: `relative absolute fixed`
3. Box: `w- h- p- m-`
4. Typography: `text- font- leading-`
5. Visual: `bg- border- rounded- shadow-`
6. Interactive: `hover: focus: active:`
7. Responsive: `sm: md: lg:`

## responsive design
- Mobile-first: base = mobile, `md:` = tablet, `lg:` = desktop
- Never use `xs:` — base classes handle mobile
- Common breakpoints: `md:flex-row` (stack → row), `lg:grid-cols-3`

## dark mode
- Use `dark:` variant with `class` strategy (set by `document.documentElement.classList`)
- Pair every color with dark variant: `bg-white dark:bg-zinc-900`
- Use CSS variables via shadcn for consistent theming

## arbitrary values — use sparingly
```
w-[347px]          ← ok for pixel-perfect design specs
bg-[#1a1a2e]       ← ok for brand colors not in palette
top-[calc(100%-1px)] ← ok for complex positioning
```

## common patterns
```
# Centered container
<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

# Flex row with gap
<div className="flex items-center gap-3">

# Full-screen centered
<div className="flex min-h-screen items-center justify-center">

# Card
<div className="rounded-lg border bg-card p-6 shadow-sm">

# Truncate text
<p className="truncate">  or  <p className="line-clamp-2">
```

## anti-patterns
- No `style={{}}` for things Tailwind can do
- No custom CSS for spacing/colors that exist in the scale
- No `!important` modifier unless overriding third-party styles
- No mixing Tailwind with CSS Modules in same component
