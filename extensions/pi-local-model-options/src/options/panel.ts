import type { ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";
import type { SettingItem } from "@earendil-works/pi-tui";
import {
  formatOptionValue,
  MODEL_OPTION_DEFINITIONS,
  MODEL_OPTION_KEYS,
  type ModelOptionKey,
  type ModelOptions,
} from "./definitions";
import {
  applyPreset,
  getPresetValue,
  isPresetId,
  PRESET_ITEMS,
  type PresetId,
} from "./presets";
import {
  getModelOptions,
  resetModelOptions,
  saveStore,
  setModelOptions,
} from "../store";
import {
  getModelKey,
  type ActiveModel,
  type ExtensionState,
} from "../core/state";
import { renderOptionsStatus } from "./status";
import { createInputDialog, createSelectDialog } from "../ui/dialogs";
import { openSettingsPanel, type SettingsPanelControls } from "../ui/panel";

const INPUT_HINT = "Enter to save • Esc cancel";
const EMPTY_OPTIONS: ModelOptions = { enabled: false };
const ENABLED_ID = "enabled";
const PRESET_ID = "preset";
const RESET_ID = "reset";
const TRUE_VALUE = "true";
const FALSE_VALUE = "false";
const CLEAR_VALUE = "clear";
const UNSET_VALUE = "-";
const EMPTY_VALUE = "";
const PRESET_TITLE = "Preset";
const RESET_LABEL = "Reset current model";
const INVALID_VALUE_MESSAGE = "Invalid value";
const ERROR_LEVEL = "error";

function buildEnabledItem(options: ModelOptions): SettingItem {
  return {
    id: ENABLED_ID,
    label: "Enabled",
    currentValue: String(options.enabled),
    values: [TRUE_VALUE, FALSE_VALUE],
  };
}

function buildNumberItem(
  id: string,
  label: string,
  currentValue: string,
  theme: Theme,
): SettingItem {
  return {
    id,
    label,
    currentValue,
    submenu: (value: string, done: (selectedValue?: string) => void) =>
      createInputDialog(
        label,
        value === UNSET_VALUE ? EMPTY_VALUE : value,
        INPUT_HINT,
        theme,
        done,
      ),
  };
}

function buildPresetItem(options: ModelOptions, theme: Theme): SettingItem {
  return {
    id: PRESET_ID,
    label: PRESET_TITLE,
    currentValue: getPresetValue(options),
    submenu: (_currentValue: string, done: (selectedValue?: string) => void) =>
      createSelectDialog(PRESET_TITLE, PRESET_ITEMS, theme, done),
  };
}

function buildResetItem(): SettingItem {
  return {
    id: RESET_ID,
    label: RESET_LABEL,
    currentValue: CLEAR_VALUE,
    values: [CLEAR_VALUE],
  };
}

function buildSettingItem(
  key: ModelOptionKey,
  options: ModelOptions,
  theme: Theme,
): SettingItem {
  return buildNumberItem(
    key,
    MODEL_OPTION_DEFINITIONS[key].label,
    formatOptionValue(key, options[key]),
    theme,
  );
}

function buildSettingItems(options: ModelOptions, theme: Theme): SettingItem[] {
  return [
    buildEnabledItem(options),
    ...MODEL_OPTION_KEYS.map((key) => buildSettingItem(key, options, theme)),
    buildPresetItem(options, theme),
    buildResetItem(),
  ];
}

function refreshSettingItems(
  controls: SettingsPanelControls,
  options: ModelOptions,
): void {
  controls.updateValue(ENABLED_ID, String(options.enabled));
  for (const key of MODEL_OPTION_KEYS) {
    controls.updateValue(key, formatOptionValue(key, options[key]));
  }
  controls.updateValue(PRESET_ID, getPresetValue(options));
  controls.updateValue(RESET_ID, CLEAR_VALUE);
}

function isModelOptionKey(value: string): value is ModelOptionKey {
  return value in MODEL_OPTION_DEFINITIONS;
}

function clearModelOptions(state: ExtensionState, model: ActiveModel): void {
  state.store = resetModelOptions(state.store, model);
  saveStore(state.store);
}

function persistModelOptions(
  state: ExtensionState,
  model: ActiveModel,
  options: ModelOptions,
): void {
  state.store = setModelOptions(state.store, model, options);
  saveStore(state.store);
}

function resetOptions(state: ExtensionState, model: ActiveModel): ModelOptions {
  clearModelOptions(state, model);
  return EMPTY_OPTIONS;
}

function saveOptions(
  state: ExtensionState,
  model: ActiveModel,
  options: ModelOptions,
): ModelOptions {
  persistModelOptions(state, model, options);
  return options;
}

type OptionAction =
  | { type: "set-enabled"; enabled: boolean }
  | { type: "apply-preset"; presetId: PresetId }
  | { type: "reset" }
  | { type: "set-option"; key: ModelOptionKey; value: number };

type ActionResult =
  | { ok: true; action: OptionAction }
  | { ok: false; message: string };

function invalid(message: string): ActionResult {
  return { ok: false, message };
}

function valid(action: OptionAction): ActionResult {
  return { ok: true, action };
}

function parseOptionAction(id: string, value: string): ActionResult {
  if (id === ENABLED_ID) {
    if (value === TRUE_VALUE)
      return valid({ type: "set-enabled", enabled: true });
    if (value === FALSE_VALUE) {
      return valid({ type: "set-enabled", enabled: false });
    }
    return invalid(INVALID_VALUE_MESSAGE);
  }

  if (id === PRESET_ID) {
    if (!isPresetId(value)) return invalid(INVALID_VALUE_MESSAGE);
    return valid({ type: "apply-preset", presetId: value });
  }

  if (id === RESET_ID) return valid({ type: "reset" });
  if (!isModelOptionKey(id)) return invalid(INVALID_VALUE_MESSAGE);

  const result = MODEL_OPTION_DEFINITIONS[id].validate(value);
  if (!result.ok || result.value === undefined) {
    return invalid(result.message ?? INVALID_VALUE_MESSAGE);
  }

  return valid({ type: "set-option", key: id, value: result.value });
}

function applyOptionAction(
  state: ExtensionState,
  model: ActiveModel,
  action: OptionAction,
): ModelOptions {
  const current = getModelOptions(state.store, model) ?? EMPTY_OPTIONS;

  if (action.type === "set-enabled") {
    return saveOptions(state, model, { ...current, enabled: action.enabled });
  }
  if (action.type === "apply-preset") {
    return saveOptions(state, model, applyPreset(current, action.presetId));
  }
  if (action.type === "reset") return resetOptions(state, model);

  return saveOptions(state, model, {
    ...current,
    [action.key]: action.value,
    enabled: true,
  });
}

export async function openOptionsPanel(
  state: ExtensionState,
  ctx: ExtensionContext,
  model: ActiveModel,
): Promise<void> {
  const options = getModelOptions(state.store, model) ?? EMPTY_OPTIONS;

  await openSettingsPanel(ctx, {
    title: `Model options: ${getModelKey(model)}`,
    buildItems: (theme) => buildSettingItems(options, theme),
    onChange: (id, value, controls) => {
      const result = parseOptionAction(id, value);
      if (!result.ok) {
        ctx.ui.notify(result.message, ERROR_LEVEL);
        controls.requestRender();
        return;
      }

      const next = applyOptionAction(state, model, result.action);
      renderOptionsStatus(state, ctx);
      refreshSettingItems(controls, next);
      controls.requestRender();
    },
  });
}
