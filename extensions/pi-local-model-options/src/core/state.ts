import type { ActiveModel } from "./model.js";
import type { Store } from "../options/types.js";
import { loadStore } from "../options/store.js";

export interface ExtensionState {
  store: Store;
  activeModel: ActiveModel | undefined;
}

export function createState(): ExtensionState {
  return {
    store: loadStore(),
    activeModel: undefined,
  };
}

export function setActiveModel(
  state: ExtensionState,
  model: ActiveModel | undefined,
): void {
  state.activeModel = model;
}
