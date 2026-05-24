import fs from "node:fs";
import path from "node:path";
import { getModelKey, type ActiveModel } from "../core/model.js";
import { EMPTY_STORE, STORE_PATH } from "./defaults.js";
import type { ModelOptions, Store } from "./types.js";

export function loadStore(): Store {
  try {
    if (!fs.existsSync(STORE_PATH)) return EMPTY_STORE;
    const raw = JSON.parse(fs.readFileSync(STORE_PATH, "utf8")) as unknown;
    return isStore(raw) ? raw : EMPTY_STORE;
  } catch {
    return EMPTY_STORE;
  }
}

export function saveStore(store: Store): void {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

export function getModelOptions(
  store: Store,
  model: ActiveModel,
): ModelOptions | undefined {
  return store.models[getModelKey(model)];
}

export function setModelOptions(
  store: Store,
  model: ActiveModel,
  options: ModelOptions,
): Store {
  return {
    ...store,
    models: {
      ...store.models,
      [getModelKey(model)]: options,
    },
  };
}

export function resetModelOptions(store: Store, model: ActiveModel): Store {
  const models = { ...store.models };
  delete models[getModelKey(model)];
  return { ...store, models };
}

export function hasConfiguredValues(
  options: ModelOptions | undefined,
): boolean {
  return (
    options !== undefined &&
    (options.temperature !== undefined ||
      options.top_p !== undefined ||
      options.num_ctx !== undefined)
  );
}

function isStore(value: unknown): value is Store {
  if (!isRecord(value)) return false;
  if (value.version !== 1) return false;
  if (!isRecord(value.models)) return false;
  return Object.values(value.models).every(isModelOptions);
}

function isModelOptions(value: unknown): value is ModelOptions {
  if (!isRecord(value)) return false;
  if (typeof value.enabled !== "boolean") return false;
  if (value.temperature !== undefined && !Number.isFinite(value.temperature))
    return false;
  if (value.top_p !== undefined && !Number.isFinite(value.top_p)) return false;
  if (value.num_ctx !== undefined && !Number.isInteger(value.num_ctx))
    return false;
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
