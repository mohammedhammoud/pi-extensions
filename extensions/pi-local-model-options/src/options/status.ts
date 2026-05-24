import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import {
  formatOptionValue,
  hasConfiguredValues,
  MODEL_OPTION_DEFINITIONS,
  MODEL_OPTION_KEYS,
  type ModelOptions,
} from "./definitions";
import { getModelOptions } from "../store";
import {
  getModelKey,
  getContextModel,
  type ActiveModel,
  type ExtensionState,
} from "../core/state";
import { getPresetId } from "./presets";

const STATUS_KEY = "local-options";
const STATUS_SEPARATOR = " ";

function clearStatus(ctx: ExtensionContext): void {
  ctx.ui.setStatus(STATUS_KEY, "");
}

function formatStatus(model: ActiveModel, options: ModelOptions): string {
  const presetId = getPresetId(options);
  const presetLabel = presetId
    ? presetId.charAt(0).toUpperCase() + presetId.slice(1)
    : "";

  const values = MODEL_OPTION_KEYS.map((key) => {
    const definition = MODEL_OPTION_DEFINITIONS[key];
    return `${definition.statusLabel}=${formatOptionValue(key, options[key])}`;
  }).join(STATUS_SEPARATOR);

  if (presetLabel) {
    return `local ${getModelKey(model)} ${presetLabel} ${values}`;
  }

  return `local ${getModelKey(model)} ${values}`;
}

export function renderOptionsStatus(
  state: ExtensionState,
  ctx: ExtensionContext,
): void {
  const model = getContextModel(ctx) ?? state.activeModel;
  if (!model) {
    clearStatus(ctx);
    return;
  }

  const options = getModelOptions(state.store, model);
  if (!options || !options.enabled || !hasConfiguredValues(options)) {
    clearStatus(ctx);
    return;
  }

  ctx.ui.setStatus(STATUS_KEY, formatStatus(model, options));
}
