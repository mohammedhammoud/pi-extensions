export function parseTemperature(input: string): number | undefined {
  return parseNumber(input, (value) => value >= 0 && value <= 2);
}

export function parseTopP(input: string): number | undefined {
  return parseNumber(input, (value) => value > 0 && value <= 1);
}

export function parseNumCtx(input: string): number | undefined {
  return parseInteger(input, (value) => value >= 1024);
}

export function getValidationMessage(
  id: "temperature" | "top_p" | "num_ctx",
): string {
  if (id === "temperature") return "Temperature must be between 0 and 2";
  if (id === "top_p") return "top_p must be > 0 and <= 1";
  return "num_ctx must be an integer >= 1024";
}

function parseNumber(
  input: string,
  isValid: (value: number) => boolean,
): number | undefined {
  if (input.trim() === "") return undefined;
  const parsed = Number(input);
  if (!Number.isFinite(parsed)) return undefined;
  return isValid(parsed) ? parsed : undefined;
}

function parseInteger(
  input: string,
  isValid: (value: number) => boolean,
): number | undefined {
  if (input.trim() === "") return undefined;
  const parsed = Number(input);
  if (!Number.isInteger(parsed)) return undefined;
  return isValid(parsed) ? parsed : undefined;
}
