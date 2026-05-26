export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function hasNumber(
  value: Record<string, unknown>,
  key: string,
): boolean {
  return typeof value[key] === "number";
}

export function hasString(
  value: Record<string, unknown>,
  key: string,
): boolean {
  return typeof value[key] === "string";
}

export function hasOptionalString(
  value: Record<string, unknown>,
  key: string,
): boolean {
  return value[key] === undefined || typeof value[key] === "string";
}

export function hasStringArray(
  value: Record<string, unknown>,
  key: string,
): boolean {
  return (
    Array.isArray(value[key]) &&
    value[key].every((item) => typeof item === "string")
  );
}
