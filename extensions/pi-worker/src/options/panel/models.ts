import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { ActiveModel } from "../../core/state";
import { getModelKey } from "../../core/state";
import { openSearchSelect } from "./search-select";

export interface ModelInfo extends ActiveModel {
  label: string;
}

export function getSelectableModels(
  ctx: ExtensionContext,
  current: ActiveModel | undefined,
): ModelInfo[] {
  const availableModels = ctx.modelRegistry.getAvailable();
  const sourceModels =
    availableModels.length > 0 ? availableModels : ctx.modelRegistry.getAll();
  const models = dedupeModels(sourceModels.map(toModelInfo));

  if (
    current &&
    !models.some((model) => model.label === getModelKey(current))
  ) {
    models.push(toModelInfo(current));
  }

  return sortModels(models, current);
}

export function pickInitialModel(
  models: ModelInfo[],
  currentModel: ActiveModel | undefined,
): ModelInfo {
  if (!currentModel) return models[0]!;
  const currentKey = getModelKey(currentModel);
  return models.find((model) => model.label === currentKey) ?? models[0]!;
}

export async function selectWorkerModel(
  ctx: ExtensionContext,
  models: ModelInfo[],
  currentModel: ModelInfo,
): Promise<ModelInfo | undefined> {
  const labels = [
    currentModel.label,
    ...models
      .map((model) => model.label)
      .filter((label) => label !== currentModel.label),
  ];

  const selected = await openSearchSelect(ctx, "worker model", labels);
  return models.find((model) => model.label === selected);
}

function toModelInfo(model: ActiveModel): ModelInfo {
  return {
    provider: model.provider,
    id: model.id,
    label: getModelKey(model),
  };
}

function dedupeModels(models: ModelInfo[]): ModelInfo[] {
  const seen = new Set<string>();
  return models.filter((model) => {
    if (seen.has(model.label)) return false;
    seen.add(model.label);
    return true;
  });
}

function sortModels(
  models: ModelInfo[],
  current: ActiveModel | undefined,
): ModelInfo[] {
  const currentLabel = current ? getModelKey(current) : undefined;
  return models.sort((left, right) => {
    if (left.label === currentLabel) return -1;
    if (right.label === currentLabel) return 1;
    return left.label.localeCompare(right.label);
  });
}
