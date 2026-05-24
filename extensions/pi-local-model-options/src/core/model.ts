import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

export interface ActiveModel {
  provider: string;
  id: string;
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

export function formatModelKey(model: ActiveModel): string {
  return getModelKey(model);
}
