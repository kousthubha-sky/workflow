# shadcn/component-patterns

## adding components
- `npx shadcn@latest add <component>` — copies source into `components/ui/`
- Components are yours to edit — they're not a dependency
- Never edit `components/ui/` files directly if you want to re-add later; extend instead

## extending components
```tsx
// DON'T edit button.tsx directly
// DO create a wrapper
import { Button, type ButtonProps } from '@/components/ui/button'
export function PrimaryButton({ children, ...props }: ButtonProps) {
  return <Button variant="default" size="lg" className="rounded-full" {...props}>{children}</Button>
}
```

## cn() utility — always use it
```tsx
import { cn } from '@/lib/utils'
<div className={cn('base-classes', condition && 'conditional', className)} />
```

## theming
- All colors via CSS variables in `globals.css` — never hardcode colors
- Use `hsl(var(--primary))` pattern — allows dark mode without class changes
- Override in `tailwind.config.ts` under `theme.extend.colors`

## forms with react-hook-form
```tsx
// Use Form, FormField, FormItem, FormLabel, FormControl, FormMessage
// Always wrap with <Form {...form}> (spread the form object)
// FormField render prop gives you field.onChange, field.value etc.
```

## patterns
- `Dialog` + `DialogTrigger` with `asChild` to avoid button-in-button
- `DropdownMenu` for action menus — always include keyboard shortcuts in `DropdownMenuShortcut`
- `Sheet` for mobile sidebars
- `Sonner` (not `Toast`) for notifications — simpler API

## anti-patterns
- No inline Radix primitive imports if shadcn has the component
- No custom modal implementations — use Dialog
- No `z-index` hacks — use Radix portals correctly
