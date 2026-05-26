# @mohammedhammoud/pi-worker

Runs tasks in isolated `pi` CLI worker processes with a configurable TUI panel. Supports 5 modes (task, plan, refine, implement, review), model selection, timeout (2m/5m/10m/off), and plan selection from the worker storage under `~/.pi/worker/repos/<repo>/plans` when needed.

## Why useful

Workers give you a clean, separate session for focused work — no context bleed from your main session. Outputs are saved globally for history, and plan runs are also saved separately under `~/.pi/worker/plans` for refine/implement flows. The panel lets you iterate on settings before committing to a run.

Built for focused, isolated work — keeps your main session lean by offloading heavy tasks to separate worker processes.

## Usage

- `/worker` — open the TUI panel, configure settings (model, mode, timeout, plan), then write your task in the editor
- Modes cycle: task → plan → refine → implement → review
- `task` and `plan` use a free prompt with no plan picker
- `refine` and `implement` require a saved plan
- `review` can optionally use a saved plan
