# separator

2026-11-07, golden pair via CLI (`shadcn add separator --overwrite` after flipping style radix-nova -> base-nova), migrated.

## Changed

- `src/components/ui/separator.tsx`: replaced with the base-nova registry variant.
- Leftover scan clean: `grep -n "radix-ui\|@radix-ui\|IconPlaceholder" src/components/ui/separator.tsx` returns nothing.
- Shared: `src/components/ui/variants.css` no longer remaps `data-open`/`data-closed`/`data-checked`/`data-unchecked`/`data-selected`/`data-disabled`/`data-active` to Radix `data-state` values (Tailwind built-ins match Base UI's attributes); `--radix-accordion-content-height` -> `--accordion-panel-height`.

## Left alone

- `spinner.tsx` (cnippet, lucide only), `alert`, `card`, `field`, `input`: no Radix dependency.

## Behavior changes



## Verify by hand

- Separators still render between preview sections.
