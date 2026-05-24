import {
  hasConfiguredValues,
  MODEL_OPTION_KEYS,
  type ModelOptions,
} from "./definitions";

interface PresetDefinition {
  id: string;
  label: string;
  options: ModelOptions;
}

const PRESET_DEFINITIONS = [
  {
    id: "deterministic",
    label: "Deterministic",
    options: {
      enabled: true,
      temperature: 0.1,
      top_p: 0.9,
      num_ctx: 32768,
    },
  },
  {
    id: "balanced",
    label: "Balanced",
    options: {
      enabled: true,
      temperature: 0.3,
      top_p: 0.9,
      num_ctx: 32768,
    },
  },
  {
    id: "creative",
    label: "Creative",
    options: {
      enabled: true,
      temperature: 0.7,
      top_p: 0.95,
      num_ctx: 32768,
    },
  },
] as const satisfies readonly PresetDefinition[];

export type PresetId = (typeof PRESET_DEFINITIONS)[number]["id"];

const PRESET_IDS = PRESET_DEFINITIONS.map((preset) => preset.id);
const PRESETS_BY_ID = Object.fromEntries(
  PRESET_DEFINITIONS.map((preset) => [preset.id, preset]),
) as Record<PresetId, (typeof PRESET_DEFINITIONS)[number]>;

function isPresetMatch(
  options: ModelOptions,
  preset: PresetDefinition,
): boolean {
  return MODEL_OPTION_KEYS.every((key) => options[key] === preset.options[key]);
}

export function isPresetId(value: string): value is PresetId {
  return PRESET_IDS.includes(value as PresetId);
}

function getPresetId(options: ModelOptions): PresetId | undefined {
  return PRESET_DEFINITIONS.find((preset) => isPresetMatch(options, preset))
    ?.id;
}

export function getPresetValue(options: ModelOptions): string {
  return (
    getPresetId(options) ?? (hasConfiguredValues(options) ? "custom" : "-")
  );
}

export function applyPreset(
  options: ModelOptions,
  presetId: string,
): ModelOptions {
  if (!isPresetId(presetId)) return options;
  return { ...options, ...PRESETS_BY_ID[presetId].options };
}
