# Git workflow

`main` is the only long-lived branch. Each task gets its own branch and pull request into `main`; there is no integration branch and no stacked PRs.

## Work on a task

1. Work in a worktree the host manages, based on current `origin/main`. A T3 Code thread on the main checkout moves itself with `t3_worktree_handoff` before editing; the project's worktree script runs `pnpm install --frozen-lockfile`. Without host worktree tools, use `git worktree add` and run `pnpm install --frozen-lockfile`.
2. Commit work in progress instead of using `git stash`: stashes are shared by every worktree.
3. Make the change and run `pnpm check:schedule`, `pnpm check:contrast` and `pnpm build` (see [verification](verification.md)).
4. End every code task with a commit and a pull request to `main`, without being asked. Opening a PR is safe; only a merge deploys GitHub Pages.
5. The `build` job runs on the PR. Watch it and fix failures until it passes. To merge without waiting, queue it with `gh pr merge --auto --merge`; GitHub merges once the required checks pass.
6. Merge only when the user asks, with a merge commit.

Fetch before choosing a base. Use `git pull --ff-only` to advance a local `main`; inspect divergent histories and merge deliberately. Never force-push `main`.

## What runs where

| Event | Effect |
| --- | --- |
| Pull request | [Pages workflow](../.github/workflows/pages.yml) runs the checks and build, without deploying |
| Push or merge to `main` | Same checks, then deploys GitHub Pages |
| Monthly | [Dependabot](../.github/dependabot.yml) opens one grouped minor-and-patch PR per ecosystem; majors one PR each. Merged by hand |

## Repository controls

`main` requires a pull request, the `build` check and resolved conversations; rules apply to administrators, and force pushes and deletion are blocked. It does not require branches to be up to date: the deploy job waits for the checks on the merged commit. Auto-merge is allowed and merged branches are deleted automatically.

## Cleanup

GitHub deletes a merged PR's branch. Remove the task's worktree through the host (or `git worktree remove`) once it has no uncommitted or unmerged work.
