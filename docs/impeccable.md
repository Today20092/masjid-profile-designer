# Impeccable design tooling

[Impeccable](https://github.com/pbakaus/impeccable) is installed as a project-local Codex skill in `.agents/skills/impeccable/` (skill 4.7.0, engine 0.1.16). It is development tooling and adds no application dependency.

## Install or refresh

Run from the repository root:

```sh
pnpm dlx impeccable install -y --providers=codex --scope=project --no-hooks
```

The skill becomes available to Codex on the next turn. Ask for `$impeccable polish` or `$impeccable audit` with the surface to review. The skill contains its workflow instructions and reference playbooks.

Automatic hooks are not installed. For manual commands on Windows, use `.agents/skills/impeccable/scripts/impeccable.cmd`; on other platforms, use `.agents/skills/impeccable/scripts/impeccable`. The launcher obtains its pinned native engine on first use when needed. Downloaded binaries and runtime reports are ignored by Git. Upstream license and notice files accompany the skill.

## First polish pass

The editor keeps its existing green-and-cream identity. The pass removed decorative section numbers and the introductory eyebrow, reduced introductory spacing, enlarged small form labels, darkened muted text and gold accents, and added visible keyboard focus, selection, placeholder, and caret colors. Gold against the warm background improved from approximately 3.77:1 to 5.28:1 contrast.

Verification covered browser widths from 320 to 1440 pixels without horizontal overflow, touch expansion of prayer options, visible keyboard focus, saved settings, Arabic layouts, and a real 1080 × 1080 PNG download. At the checked phone size the preview starts at 296 pixels from the page top. Impeccable's source detector reported no findings for `src/App.tsx` and `src/index.css`. Schedule assertions and the production build passed. These browser checks do not replace testing on a physical phone.

Tailwind excludes `.agents` from source scanning so examples bundled with the skill do not add unused application CSS.
