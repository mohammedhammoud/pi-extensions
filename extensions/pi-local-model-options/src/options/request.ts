import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { getContextModel } from "../core/model.js";
import type { ExtensionState } from "../core/state.js";
import { getModelOptions, hasConfiguredValues } from "./store.js";
import type { ModelOptions } from "./types.js";

export function patchPayload(
  state: ExtensionState,
  payload: unknown,
  ctx: ExtensionContext,
): unknown {
  if (!isPayload(payload)) return payload;

  const model = getContextModel(ctx) ?? state.activeModel;
  if (!model) return payload;

  const options = getModelOptions(state.store, model);
  if (!shouldPatch(options)) return payload;

  return buildPatchedPayload(payload, options);
}

function shouldPatch(
  options: ModelOptions | undefined,
): options is ModelOptions {
  return !!options && options.enabled && hasConfiguredValues(options);
}

function buildPatchedPayload(
  payload: Record<string, unknown>,
  options: ModelOptions,
): Record<string, unknown> {
  const next = omitNullish(payload);
  if (options.temperature !== undefined) next.temperature = options.temperature;
  if (options.top_p !== undefined) next.top_p = options.top_p;
  next.options = buildProviderOptions(payload.options, options);
  return next;
}

function buildProviderOptions(
  existing: unknown,
  options: ModelOptions,
): Record<string, unknown> {
  const next = isPayload(existing) ? omitNullish(existing) : {};
  if (options.temperature !== undefined) next.temperature = options.temperature;
  if (options.top_p !== undefined) next.top_p = options.top_p;
  if (options.num_ctx !== undefined) next.num_ctx = options.num_ctx;
  return next;
}

function omitNullish(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(payload).filter(
      ([, value]) => value !== null && value !== undefined,
    ),
  );
}

function isPayload(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
