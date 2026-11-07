# button

2026-11-07, golden pair via CLI (`shadcn add button --overwrite` after flipping style radix-nova -> base-nova), migrated.

## Changed

- `src/components/ui/button.tsx`: replaced with the base-nova registry variant. Customization replayed: `transition-colors` (stock is `transition-all`).
- `src/App.tsx`: the four `<Button asChild><a …>` links became `<a className={buttonVariants({ variant })}>`. Base UI's `render` + `nativeButton={false}` adds `role="button"` to anchors, which would announce navigation links as buttons.
- Leftover scan clean: `grep -n "radix-ui\|@radix-ui\|IconPlaceholder" src/components/ui/button.tsx` returns nothing.
- Shared: `src/components/ui/variants.css` no longer remaps `data-open`/`data-closed`/`data-checked`/`data-unchecked`/`data-selected`/`data-disabled`/`data-active` to Radix `data-state` values (Tailwind built-ins match Base UI's attributes); `--radix-accordion-content-height` -> `--accordion-panel-height`.

## Left alone

- `spinner.tsx` (cnippet, lucide only), `alert`, `card`, `field`, `input`: no Radix dependency.

## Behavior changes

- None at call sites; anchors keep link semantics.

## Verify by hand

- Tab to "Edit times" / "Choose design": focus ring visible, Enter jumps to the section, a screen reader says "link".
