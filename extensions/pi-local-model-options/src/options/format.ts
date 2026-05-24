import { formatModelKey, type ActiveModel } from "../core/model.js";
import type { ModelOptions } from "./types.js";

export function formatOptionValue(value: number | undefined): string {
  return value === undefined ? "-" : String(value);
}

export function formatStatus(
  model: ActiveModel,
  options: ModelOptions,
): string {
  return `local ${formatModelKey(model)} temp=${formatOptionValue(options.temperature)} top_p=${formatOptionValue(options.top_p)} ctx=${formatOptionValue(options.num_ctx)}`;
}
