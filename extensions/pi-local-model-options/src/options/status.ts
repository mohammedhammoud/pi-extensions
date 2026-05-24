import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { getContextModel } from "../core/model.js";
import type { ExtensionState } from "../core/state.js";
import { STATUS_KEY } from "./defaults.js";
import { formatStatus } from "./format.js";
import { getModelOptions, hasConfiguredValues } from "./store.js";

export function renderStatus(
  state: ExtensionState,
  ctx: ExtensionContext,
): void {
  const model = getContextModel(ctx) ?? state.activeModel;
  if (!model) {
    clearStatus(ctx);
    return;
  }

  const options = getModelOptions(state.store, model);
  if (!options || !options.enabled || !hasConfiguredValues(options)) {
    clearStatus(ctx);
    return;
  }

  ctx.ui.setStatus(STATUS_KEY, formatStatus(model, options));
}

function clearStatus(ctx: ExtensionContext): void {
  ctx.ui.setStatus(STATUS_KEY, "");
}
