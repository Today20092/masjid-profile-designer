# project

2026-11-07, whole-project migration, Radix -> Base UI (`@base-ui/react`), style radix-nova -> base-nova.

- Dependencies: added `@base-ui/react`, removed `radix-ui` (pnpm). No file imports Radix.
- App-code sweep (`src/App.tsx`): asChild links -> styled anchors; Accordion/ToggleGroup `type` removed and array values; Select `items`. CSS: `[data-state="on"]` -> `[data-pressed]`; variants.css Radix aliases removed.
- Final: `pnpm check` and `pnpm build` pass (baseline passed too); `pnpm check:share` passes; axe on a fresh load with accordions open: 0 violations.
- Dev server needed `vite --force` once after removing radix-ui (stale optimizer cache).
- Done as one commit, not one per component.
