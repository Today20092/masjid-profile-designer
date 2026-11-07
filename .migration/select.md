# select

2026-11-07, golden pair via CLI (`shadcn add select --overwrite` after flipping style radix-nova -> base-nova), migrated.

## Changed

- `src/components/ui/select.tsx`: replaced with the base-nova registry variant. 
- `src/App.tsx` `Choice`: added `items={options}`. Without it Base UI's `Select.Value` shows the raw value ("both") instead of the label.
- Leftover scan clean: `grep -n "radix-ui\|@radix-ui\|IconPlaceholder" src/components/ui/select.tsx` returns nothing.
- Shared: `src/components/ui/variants.css` no longer remaps `data-open`/`data-closed`/`data-checked`/`data-unchecked`/`data-selected`/`data-disabled`/`data-active` to Radix `data-state` values (Tailwind built-ins match Base UI's attributes); `--radix-accordion-content-height` -> `--accordion-panel-height`.

## Left alone

- `spinner.tsx` (cnippet, lucide only), `alert`, `card`, `field`, `input`: no Radix dependency.

## Behavior changes

- While open, axe flags Base UI focus guards (`aria-hidden-focus`, known false positive) and an unnamed listbox (`aria-input-field-name`). Not patched.

## Verify by hand

- Open each select by click and by ArrowDown; type-ahead; Escape returns focus to the trigger (verified); the trigger shows the label after choosing.
