import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { getContextModel } from "../core/model.js";
import type { ExtensionState } from "../core/state.js";
import { openOptionsPanel } from "../ui/panel.js";

export async function openLocalCommand(
  state: ExtensionState,
  ctx: ExtensionContext,
): Promise<void> {
  const model = getContextModel(ctx) ?? state.activeModel;
  if (!model) {
    ctx.ui.notify("Pick a model first", "info");
    return;
  }

  await openOptionsPanel(state, ctx, model);
}
