# pi-extensions

Monorepo for Pi extensions.

## Extensions

- `@mohammedhammoud/pi-local-model-options` — per-model local provider options.
- `@mohammedhammoud/pi-worker` — isolated CLI worker processes with a configurable TUI panel.
- `@mohammedhammoud/pi-plan` — project-scoped Markdown plans with editor access and status toggles.

## Development

```bash
pnpm install
pnpm run check
pnpm run build
```

## Add an extension

1. Create a package under `extensions/<name>`.
2. Add its Pi package metadata in that package's `package.json`.
3. Add release metadata in `release-please-config.json`.
