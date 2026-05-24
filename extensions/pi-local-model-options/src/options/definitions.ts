type ProviderTarget = "root" | "options";

interface ValidationResult<T> {
  ok: boolean;
  value?: T;
  message?: string;
}

export interface ModelOptionDefinition {
  label: string;
  statusLabel: string;
  providerTargets: readonly ProviderTarget[];
  validate(input: string): ValidationResult<number>;
  format(value: number | undefined): string;
}

const NUMBER_FORMATTER = (value: number | undefined): string =>
  value === undefined ? "-" : String(value);

function invalid(message: string): ValidationResult<number> {
  return { ok: false, message };
}

function valid(value: number): ValidationResult<number> {
  return { ok: true, value };
}

function validateInteger(
  input: string,
  isValid: (value: number) => boolean,
  message: string,
): ValidationResult<number> {
  if (input.trim() === "") return invalid(message);
  const parsed = Number(input);
  if (!Number.isInteger(parsed)) return invalid(message);
  return isValid(parsed) ? valid(parsed) : invalid(message);
}

function validateNumber(
  input: string,
  isValid: (value: number) => boolean,
  message: string,
): ValidationResult<number> {
  if (input.trim() === "") return invalid(message);
  const parsed = Number(input);
  if (!Number.isFinite(parsed)) return invalid(message);
  return isValid(parsed) ? valid(parsed) : invalid(message);
}

function validateNumCtx(input: string): ValidationResult<number> {
  return validateInteger(
    input,
    (value) => value >= 1024,
    "num_ctx must be an integer >= 1024",
  );
}

function validateTemperature(input: string): ValidationResult<number> {
  return validateNumber(
    input,
    (value) => value >= 0 && value <= 2,
    "Temperature must be between 0 and 2",
  );
}

function validateTopP(input: string): ValidationResult<number> {
  return validateNumber(
    input,
    (value) => value > 0 && value <= 1,
    "top_p must be > 0 and <= 1",
  );
}

export const MODEL_OPTION_DEFINITIONS = {
  temperature: {
    label: "Temperature",
    statusLabel: "temp",
    providerTargets: ["root", "options"],
    validate: validateTemperature,
    format: NUMBER_FORMATTER,
  },
  top_p: {
    label: "Top P",
    statusLabel: "top_p",
    providerTargets: ["root", "options"],
    validate: validateTopP,
    format: NUMBER_FORMATTER,
  },
  num_ctx: {
    label: "Num ctx",
    statusLabel: "ctx",
    providerTargets: ["options"],
    validate: validateNumCtx,
    format: NUMBER_FORMATTER,
  },
} as const satisfies Record<string, ModelOptionDefinition>;

export type ModelOptionKey = keyof typeof MODEL_OPTION_DEFINITIONS;

export interface ModelOptions extends Partial<Record<ModelOptionKey, number>> {
  enabled: boolean;
}

export const MODEL_OPTION_KEYS = Object.keys(
  MODEL_OPTION_DEFINITIONS,
) as ModelOptionKey[];

export function formatOptionValue(
  key: ModelOptionKey,
  value: number | undefined,
): string {
  return MODEL_OPTION_DEFINITIONS[key].format(value);
}

export function hasConfiguredValues(
  options: ModelOptions | undefined,
): options is ModelOptions {
  return (
    !!options && MODEL_OPTION_KEYS.some((key) => options[key] !== undefined)
  );
}
