# @mh/pi-local-model-options

Per-model configuration for local LLM providers (Ollama, LM Studio, etc.). Lets you set temperature, top_p, and context window per model, with 3 built-in presets (Precise, Balanced, Exploratory). Options persist to `~/.pi/agent/local-options.json` and are automatically applied when that model is active.

## Why useful

Local providers often need different settings for different tasks — a coding model needs lower temperature than a brainstorming model. This extension lets you tune each model independently without touching config files, and the status indicator in the UI shows at a glance which models have custom options.

Built with limited context windows in mind. Different models, different needs.

## Usage

- `/local` — open the options panel for the active model
- Presets: Precise (low temp, deterministic), Balanced (default), Exploratory (high temp, creative)
- Manual: set `enabled`, `temperature` (0–2), `top_p` (0–1), `num_ctx` (≥1024)
