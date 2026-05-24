import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { loadStore } from "../store";
import type { Store } from "../store";

export interface ActiveModel {
  provider: string;
  id: string;
}

export interface ExtensionState {
  store: Store;
  activeModel: ActiveModel | undefined;
}

export function getContextModel(
  ctx: ExtensionContext,
): ActiveModel | undefined {
  if (!ctx.model) return undefined;
  return { provider: ctx.model.provider, id: ctx.model.id };
}

export function getModelKey(model: ActiveModel): string {
  return `${model.provider}/${model.id}`;
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
