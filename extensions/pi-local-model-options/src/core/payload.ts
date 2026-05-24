import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import {
  hasConfiguredValues,
  MODEL_OPTION_DEFINITIONS,
  MODEL_OPTION_KEYS,
  type ModelOptions,
} from "../options/definitions";
import { getModelOptions } from "../store";
import { getContextModel, type ExtensionState } from "./state";

interface ProviderOptionsPatch {
  root: Record<string, number>;
  options: Record<string, number>;
}

function buildProviderOptionsPatch(
  options: ModelOptions,
): ProviderOptionsPatch {
  const patch: ProviderOptionsPatch = { root: {}, options: {} };

  for (const key of MODEL_OPTION_KEYS) {
    const value = options[key];
    if (value === undefined) continue;

    for (const target of MODEL_OPTION_DEFINITIONS[key].providerTargets) {
      patch[target][key] = value;
    }
  }

  return patch;
}

function isPayload(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
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

function mergePayloadPatch(
  payload: Record<string, unknown>,
  patch: ProviderOptionsPatch,
): Record<string, unknown> {
  const next = { ...omitNullish(payload), ...patch.root };
  const existingOptions = isPayload(payload.options)
    ? omitNullish(payload.options)
    : {};

  next.options = { ...existingOptions, ...patch.options };
  return next;
}

function shouldPatch(
  options: ModelOptions | undefined,
): options is ModelOptions {
  return !!options && options.enabled && hasConfiguredValues(options);
}

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

  return mergePayloadPatch(payload, buildProviderOptionsPatch(options));
}
