# Local Markdown tracker

## Wayfinding operations

Each issue is a Markdown file with a stable `id`, `title`, `labels`, `status`, and `assignee` in its front matter. Tickets also contain `parent` and `blocked_by` IDs. Only `wayfinder:` labels are used.

- Map: `map.md`.
- Child issues: files in `tickets/` with `parent: map`.
- Claim: assign the ticket to the developer driving the session before starting work.
- Frontier: open child tickets with no assignee and all `blocked_by` tickets closed. Use filename order.
- Blocking: `blocked_by` is the fallback relationship because Markdown has no native dependency support.
- Resolution: append a dated resolution comment below the question, mark the ticket closed, and add a named link with a one-line gist to the map's Decisions so far.
- Assets: link separate files from the ticket; do not paste their contents into it.

The original charting session created the map without resolving tickets. The user's later implement-spec request explicitly authorizes resolving all tickets in the implementation session.
