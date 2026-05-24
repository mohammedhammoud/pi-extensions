import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getModelKey, type ActiveModel } from "./core/state";
import {
  MODEL_OPTION_DEFINITIONS,
  type ModelOptionKey,
  type ModelOptions,
} from "./options/definitions";

export interface Store {
  version: 1;
  models: Record<string, ModelOptions>;
}

const STORE_PATH = path.join(
  os.homedir(),
  ".pi",
  "agent",
  "local-options.json",
);

const EMPTY_STORE: Store = { version: 1, models: {} };

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isModelOptionKey(value: string): value is ModelOptionKey {
  return value in MODEL_OPTION_DEFINITIONS;
}

function isModelOptions(value: unknown): value is ModelOptions {
  if (!isRecord(value)) return false;
  if (typeof value.enabled !== "boolean") return false;

  for (const [key, optionValue] of Object.entries(value)) {
    if (key === "enabled") continue;
    if (!isModelOptionKey(key)) return false;
    if (typeof optionValue !== "number") return false;
  }

  return true;
}

function isStore(value: unknown): value is Store {
  if (!isRecord(value)) return false;
  if (value.version !== 1) return false;
  if (!isRecord(value.models)) return false;
  return Object.values(value.models).every(isModelOptions);
}

export function getModelOptions(
  store: Store,
  model: ActiveModel,
): ModelOptions | undefined {
  return store.models[getModelKey(model)];
}

export function loadStore(): Store {
  try {
    if (!fs.existsSync(STORE_PATH)) return EMPTY_STORE;
    const raw = JSON.parse(fs.readFileSync(STORE_PATH, "utf8")) as unknown;
    return isStore(raw) ? raw : EMPTY_STORE;
  } catch {
    return EMPTY_STORE;
  }
}

export function resetModelOptions(store: Store, model: ActiveModel): Store {
  const models = { ...store.models };
  delete models[getModelKey(model)];
  return { ...store, models };
}

export function saveStore(store: Store): void {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
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
