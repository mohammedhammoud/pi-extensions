# pi-plan

Project-scoped Markdown plans for Pi. Requires interactive terminal mode.

## Commands

- `/plan:new <prompt>` — generate a new Active plan.
- `/plan:edit <prompt>` — choose a plan and generate a revision without changing its status.
- `/plan:list` — choose Active or Done, then browse this project's plans.
- `/plan:show` — choose a plan and view it read-only inside Pi.

Omit a prompt to enter it in a multi-line dialog. Escape cancels selection or generation without saving.

In `/plan:list`:

- **Enter** opens the actual Markdown file in `$VISUAL`, then `$EDITOR`.
- **Tab** moves the selected plan between Active and Done. It disappears from the current status list.
- **X** asks for confirmation, then moves the selected plan to trash.
- **Escape** returns to status selection; Escape there closes the browser.

Pi 0.75.5 uses `VISUAL` and `EDITOR` for its external editor; this extension follows that convention. If neither is set, opening a plan reports an error. Editor commands can include arguments, e.g. `EDITOR='code --wait'`; GUI editors must wait for the file to close.

## Storage and project identity

```text
~/.pi/plans/{project_name}/
  active/{uuid}.md
  done/{uuid}.md
  trash/{uuid}.md
```

The Git working-tree root identifies the project, including when Pi starts in a subdirectory. Outside Git, the starting directory is the project. Paths are canonicalized to resolve symlinks. Same-named projects share a folder but are filtered by their full project path in each document's metadata.

Plans have an AI-generated title, UUID filename, and JSON-quoted scalar frontmatter (`id`, `title`, `projectPath`, `createdAt`, `updatedAt`). Status comes from the containing folder. Preserve the metadata when editing manually; invalid documents report their path instead of being silently hidden. Duplicate titles are allowed.

Restore deleted plans manually by moving the file from `trash/` back to `active/` or `done/`. No permanent deletion or automatic trash cleanup occurs.

## Generation

Uses the selected model and Pi's configured authentication. The request includes the prompt, project path, current branch's conversation messages, and previous plan when revising. These are sent to that model's provider. Generation does not execute tools or inspect project files: provide relevant context in the conversation and review assumptions before implementation. Generated revisions refuse to overwrite a file changed while generation was running. Cancellation, incomplete output, and model errors leave existing plans unchanged.

## Development

From the repository root:

```bash
pnpm install
pnpm --filter @mohammedhammoud/pi-plan test
pnpm run check
pnpm run build
pi -e ./extensions/pi-plan/src/index.ts
```
