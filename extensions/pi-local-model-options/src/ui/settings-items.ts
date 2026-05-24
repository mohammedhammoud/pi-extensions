import type { Theme } from "@earendil-works/pi-coding-agent";
import type { SettingItem } from "@earendil-works/pi-tui";
import { getPresetValue, PRESET_ITEMS } from "../preset/presets.js";
import { EMPTY_OPTIONS, INPUT_HINT } from "../options/defaults.js";
import { formatOptionValue } from "../options/format.js";
import { getModelOptions } from "../options/store.js";
import type { ModelOptions } from "../options/types.js";
import type { ActiveModel } from "../core/model.js";
import type { ExtensionState } from "../core/state.js";
import { createInputDialog, createSelectDialog } from "./dialogs.js";

export function buildSettingItems(
  state: ExtensionState,
  model: ActiveModel,
  theme: Theme,
): SettingItem[] {
  return buildItems(
    getModelOptions(state.store, model) ?? EMPTY_OPTIONS,
    theme,
  );
}

export function refreshSettingItems(
  settingsList: Pick<SettingsListUpdater, "updateValue">,
  options: ModelOptions,
): void {
  settingsList.updateValue("enabled", String(options.enabled));
  settingsList.updateValue(
    "temperature",
    formatOptionValue(options.temperature),
  );
  settingsList.updateValue("top_p", formatOptionValue(options.top_p));
  settingsList.updateValue("num_ctx", formatOptionValue(options.num_ctx));
  settingsList.updateValue("preset", getPresetValue(options));
  settingsList.updateValue("reset", "clear");
}

interface SettingsListUpdater {
  updateValue(id: string, value: string): void;
}

function buildItems(options: ModelOptions, theme: Theme): SettingItem[] {
  return [
    buildEnabledItem(options),
    buildNumberItem("temperature", "Temperature", options.temperature, theme),
    buildNumberItem("top_p", "Top P", options.top_p, theme),
    buildNumberItem("num_ctx", "Num ctx", options.num_ctx, theme),
    buildPresetItem(options, theme),
    buildResetItem(),
  ];
}

function buildEnabledItem(options: ModelOptions): SettingItem {
  return {
    id: "enabled",
    label: "Enabled",
    currentValue: String(options.enabled),
    values: ["true", "false"],
  };
}

function buildNumberItem(
  id: "temperature" | "top_p" | "num_ctx",
  label: string,
  value: number | undefined,
  theme: Theme,
): SettingItem {
  return {
    id,
    label,
    currentValue: formatOptionValue(value),
    submenu: (currentValue: string, done: (selectedValue?: string) => void) =>
      createInputDialog(
        label,
        currentValue === "-" ? "" : currentValue,
        INPUT_HINT,
        theme,
        done,
      ),
  };
}

function buildPresetItem(options: ModelOptions, theme: Theme): SettingItem {
  return {
    id: "preset",
    label: "Preset",
    currentValue: getPresetValue(options),
    submenu: (_currentValue: string, done: (selectedValue?: string) => void) =>
      createSelectDialog("Preset", PRESET_ITEMS, theme, done),
  };
}

function buildResetItem(): SettingItem {
  return {
    id: "reset",
    label: "Reset current model",
    currentValue: "clear",
    values: ["clear"],
  };
}
