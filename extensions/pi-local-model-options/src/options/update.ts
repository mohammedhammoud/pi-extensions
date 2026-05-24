import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { ActiveModel } from "../core/model.js";
import type { ExtensionState } from "../core/state.js";
import { applyPreset } from "../preset/presets.js";
import { clearModelOptions, persistModelOptions } from "./mutations.js";
import { EMPTY_OPTIONS } from "./defaults.js";
import { getModelOptions } from "./store.js";
import type { ModelOptions, OptionId } from "./types.js";
import {
  getValidationMessage,
  parseNumCtx,
  parseTemperature,
  parseTopP,
} from "./validation.js";

export function applyOptionChange(
  state: ExtensionState,
  ctx: ExtensionContext,
  model: ActiveModel,
  id: OptionId,
  value: string,
): ModelOptions {
  const current = getModelOptions(state.store, model) ?? EMPTY_OPTIONS;

  if (id === "enabled")
    return saveOptions(state, model, { ...current, enabled: value === "true" });
  if (id === "preset")
    return saveOptions(state, model, applyPreset(current, value));
  if (id === "reset") return resetOptions(state, model);

  const next = applyNumericOption(ctx, current, id, value);
  if (!next) return current;
  return saveOptions(state, model, next);
}

function applyNumericOption(
  ctx: ExtensionContext,
  current: ModelOptions,
  id: "temperature" | "top_p" | "num_ctx",
  value: string,
): ModelOptions | undefined {
  const parsed = parseOptionValue(id, value);
  if (parsed === undefined) {
    ctx.ui.notify(getValidationMessage(id), "error");
    return undefined;
  }

  return { ...current, [id]: parsed, enabled: true };
}

function parseOptionValue(
  id: "temperature" | "top_p" | "num_ctx",
  value: string,
): number | undefined {
  if (id === "temperature") return parseTemperature(value);
  if (id === "top_p") return parseTopP(value);
  return parseNumCtx(value);
}

function saveOptions(
  state: ExtensionState,
  model: ActiveModel,
  options: ModelOptions,
): ModelOptions {
  persistModelOptions(state, model, options);
  return options;
}

function resetOptions(state: ExtensionState, model: ActiveModel): ModelOptions {
  clearModelOptions(state, model);
  return EMPTY_OPTIONS;
}
