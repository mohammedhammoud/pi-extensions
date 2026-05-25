# @mh/pi-worker

Runs tasks in isolated `pi` CLI worker processes with a configurable TUI panel. Supports 4 modes (task, plan, implement, review), model selection, timeout (2m/5m/10m/off), and input from either a fresh prompt or a previous worker output.

## Why useful

Workers give you a clean, separate session for focused work — no context bleed from your main session. Outputs are saved to the repo and can be reused as input for follow-up tasks. The panel lets you iterate on settings before committing to a run.

Built for focused, isolated work — keeps your main session lean by offloading heavy tasks to separate worker processes.

## Usage

- `/worker` — open the TUI panel, configure settings (model, mode, timeout, input), then write your task in the editor
- Modes cycle: task → plan → implement → review
- Input source: blank (new task) or pick a previous worker output via the panel's input picker
