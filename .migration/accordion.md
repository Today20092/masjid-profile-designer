# accordion

2026-11-07, golden pair via CLI (`shadcn add accordion --overwrite` after flipping style radix-nova -> base-nova), migrated.

## Changed

- `src/components/ui/accordion.tsx`: replaced with the base-nova registry variant. 
- `src/App.tsx`: `type="single" collapsible` removed from both accordions; calculation accordion now `value={calculationOpen ? ['location'] : []}` and `value.includes('location')`.
- Leftover scan clean: `grep -n "radix-ui\|@radix-ui\|IconPlaceholder" src/components/ui/accordion.tsx` returns nothing.
- Shared: `src/components/ui/variants.css` no longer remaps `data-open`/`data-closed`/`data-checked`/`data-unchecked`/`data-selected`/`data-disabled`/`data-active` to Radix `data-state` values (Tailwind built-ins match Base UI's attributes); `--radix-accordion-content-height` -> `--accordion-panel-height`.

## Left alone

- `spinner.tsx` (cnippet, lucide only), `alert`, `card`, `field`, `input`: no Radix dependency.

## Behavior changes

- Closed panels unmount after the exit animation (verified: open h=219px, closed = unmounted).

## Verify by hand

- Open/close a prayer's options and "Location & calculation": smooth height animation, Enter/Space toggles.
- "Review calculation settings" link opens the panel and focuses the field.
