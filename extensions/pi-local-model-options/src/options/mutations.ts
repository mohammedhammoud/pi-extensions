import type { ExtensionState } from "../core/state.js";
import type { ActiveModel } from "../core/model.js";
import { resetModelOptions, saveStore, setModelOptions } from "./store.js";
import type { ModelOptions } from "./types.js";

export function persistModelOptions(
  state: ExtensionState,
  model: ActiveModel,
  options: ModelOptions,
): void {
  state.store = setModelOptions(state.store, model, options);
  saveStore(state.store);
}

export function clearModelOptions(
  state: ExtensionState,
  model: ActiveModel,
): void {
  state.store = resetModelOptions(state.store, model);
  saveStore(state.store);
}
