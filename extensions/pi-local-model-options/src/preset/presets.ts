import type { SelectItem } from "@earendil-works/pi-tui";
import type { ModelOptions } from "../options/types.js";
import type { PresetId } from "./types.js";

const PRESETS = {
  deterministic: {
    enabled: true,
    temperature: 0.1,
    top_p: 0.9,
    num_ctx: 32768,
  },
  balanced: { enabled: true, temperature: 0.3, top_p: 0.9, num_ctx: 32768 },
  creative: { enabled: true, temperature: 0.7, top_p: 0.95, num_ctx: 32768 },
} satisfies Record<PresetId, ModelOptions>;

export const PRESET_ITEMS: SelectItem[] = [
  { value: "deterministic", label: "Deterministic" },
  { value: "balanced", label: "Balanced" },
  { value: "creative", label: "Creative" },
];

export function applyPreset(
  options: ModelOptions,
  presetId: string,
): ModelOptions {
  if (!isPresetId(presetId)) return options;
  return { ...options, ...PRESETS[presetId] };
}

export function getPresetValue(options: ModelOptions): string {
  const presetId = getPresetId(options);
  if (presetId) return presetId;
  if (
    options.temperature !== undefined ||
    options.top_p !== undefined ||
    options.num_ctx !== undefined
  )
    return "custom";
  return "-";
}

function getPresetId(options: ModelOptions): PresetId | undefined {
  for (const presetId of Object.keys(PRESETS) as PresetId[]) {
    const preset = PRESETS[presetId];
    if (
      options.temperature === preset.temperature &&
      options.top_p === preset.top_p &&
      options.num_ctx === preset.num_ctx
    ) {
      return presetId;
    }
  }

  return undefined;
}

function isPresetId(value: string): value is PresetId {
  return (
    value === "deterministic" || value === "balanced" || value === "creative"
  );
}
