# checkbox

2026-11-07, golden pair via CLI (`shadcn add checkbox --overwrite` after flipping style radix-nova -> base-nova), migrated.

## Changed

- `src/components/ui/checkbox.tsx`: replaced with the base-nova registry variant.
- Leftover scan clean: `grep -n "radix-ui\|@radix-ui\|IconPlaceholder" src/components/ui/checkbox.tsx` returns nothing.
- Shared: `src/components/ui/variants.css` no longer remaps `data-open`/`data-closed`/`data-checked`/`data-unchecked`/`data-selected`/`data-disabled`/`data-active` to Radix `data-state` values (Tailwind built-ins match Base UI's attributes); `--radix-accordion-content-height` -> `--accordion-panel-height`.

## Left alone

- `spinner.tsx` (cnippet, lucide only), `alert`, `card`, `field`, `input`: no Radix dependency.

## Behavior changes

- The element with `id` is now Base UI's hidden native input; the visible control is a `span[role=checkbox]`. Labels still toggle it and axe reports it named.

## Verify by hand

- Click a prayer name label and the box: both toggle; Space toggles when focused; disabled boxes at the row limit stay disabled.
