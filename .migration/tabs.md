# tabs

2026-11-07, golden pair via CLI (`shadcn add tabs --overwrite` after flipping style radix-nova -> base-nova), migrated.

## Changed

- `src/components/ui/tabs.tsx`: replaced with the base-nova registry variant.
- Leftover scan clean: `grep -n "radix-ui\|@radix-ui\|IconPlaceholder" src/components/ui/tabs.tsx` returns nothing.
- Shared: `src/components/ui/variants.css` no longer remaps `data-open`/`data-closed`/`data-checked`/`data-unchecked`/`data-selected`/`data-disabled`/`data-active` to Radix `data-state` values (Tailwind built-ins match Base UI's attributes); `--radix-accordion-content-height` -> `--accordion-panel-height`.

## Left alone

- `spinner.tsx` (cnippet, lucide only), `alert`, `card`, `field`, `input`: no Radix dependency.

## Behavior changes

- Base UI tabs default to manual activation (arrow keys move focus, Enter/Space activates). Flagged, not patched.

## Verify by hand

- Not used by App.tsx today; check activation feel if tabs are added.
