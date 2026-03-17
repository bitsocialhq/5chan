# Long-Running Agent Workflow

Use this playbook when a task is likely to span multiple sessions, handoffs, or spawned agents.

## Goals

- Give each fresh session a fast way to regain context
- Keep work incremental instead of one-shotting a large change
- Catch a broken local baseline before adding more code
- Leave durable artifacts that the next session can trust

## Where to Keep State

- Use `docs/agent-runs/<slug>/` when humans, review bots, or multiple toolchains need the same task state.
- Use a tool-local directory such as `.codex/runs/<slug>/` only when the task state is intentionally local to one workstation or one toolchain.
- Do not hide multi-session shared state in a private scratch file if another contributor or agent will need it later.

## Required Files

Create these files at the start of the long-running task:

- `feature-list.json`
- `progress.md`

Use the templates in `docs/agent-playbooks/templates/feature-list.template.json` and `docs/agent-playbooks/templates/progress.template.md`.

Prefer JSON for the feature list so agents can update a small number of fields without rewriting the whole document.

## Session Start Checklist

1. Run `pwd`.
2. Read `progress.md`.
3. Read `feature-list.json`.
4. Run `git log --oneline -20`.
5. Run `./scripts/agent-init.sh --smoke`.
6. Choose exactly one highest-priority item that is still `pending`, `in_progress`, or `blocked`.

If the smoke step fails, fix the broken baseline before implementing a new feature slice.

## Session Rules

- Work on one feature or task slice at a time.
- Keep the feature list machine-readable and stable. Update status, notes, files, and verification fields instead of rewriting unrelated items.
- Only mark an item verified after running the command or user flow listed in that item.
- Use spawned agents for bounded slices, not for overall task-state ownership.
- When a child agent owns one item, give it the exact item id, acceptance criteria, and files it may touch.

## Session End Checklist

1. Append a short progress entry to `progress.md`.
2. Update the touched item in `feature-list.json`.
3. Record the exact commands run for verification.
4. Capture blockers, follow-ups, and the next best item to resume.

## Recommended Progress Entry Shape

Use a short structure like:

```markdown
## 2026-03-17 14:30

- Item: F003
- Summary: Updated the browser-check flow to use the shared init/bootstrap path.
- Files: `.cursor/agents/browser-check.md`, `.codex/agents/browser-check.toml`
- Verification: `yarn build`, `yarn lint`, `yarn type-check`
- Next: Run the smoke flow and update the task-board status.
```
