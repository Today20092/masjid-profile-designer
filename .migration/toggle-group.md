# toggle-group

2026-11-07, golden pair via CLI (`shadcn add toggle-group --overwrite` after flipping style radix-nova -> base-nova), migrated.

## Changed

- `src/components/ui/toggle-group.tsx`: replaced with the base-nova registry variant. 
- `src/App.tsx`: five groups lost `type="single"`; `value` wrapped in arrays; handlers destructure `([value]) =>`.
- Leftover scan clean: `grep -n "radix-ui\|@radix-ui\|IconPlaceholder" src/components/ui/toggle-group.tsx` returns nothing.
- Shared: `src/components/ui/variants.css` no longer remaps `data-open`/`data-closed`/`data-checked`/`data-unchecked`/`data-selected`/`data-disabled`/`data-active` to Radix `data-state` values (Tailwind built-ins match Base UI's attributes); `--radix-accordion-content-height` -> `--accordion-panel-height`.

## Left alone

- `spinner.tsx` (cnippet, lucide only), `alert`, `card`, `field`, `input`: no Radix dependency.

## Behavior changes

- Clicking the pressed item again yields an empty array; the existing guards ignore it, so a choice stays selected (verified: 1 item pressed after a re-click).

## Verify by hand

- Theme, language, text size, table width, clock: arrow keys move focus, Space/Enter selects, exactly one stays pressed.
