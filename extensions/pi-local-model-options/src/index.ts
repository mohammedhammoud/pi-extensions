import type {
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import {
  createState,
  getContextModel,
  setActiveModel,
  type ExtensionState,
} from "./core/state";
import { patchPayload } from "./core/payload";
import { openOptionsPanel } from "./options/panel";
import { renderOptionsStatus } from "./options/status";

const SESSION_START_EVENT = "session_start";
const MODEL_SELECT_EVENT = "model_select";
const BEFORE_PROVIDER_REQUEST_EVENT = "before_provider_request";
const COMMAND_NAME = "local";
const COMMAND_DESCRIPTION = "Configure local options for the active model";
const PICK_MODEL_MESSAGE = "Pick a model first";
const INFO_LEVEL = "info";

async function openCommand(
  state: ExtensionState,
  ctx: ExtensionContext,
): Promise<void> {
  const model = getContextModel(ctx) ?? state.activeModel;
  if (!model) {
    ctx.ui.notify(PICK_MODEL_MESSAGE, INFO_LEVEL);
    return;
  }

  await openOptionsPanel(state, ctx, model);
}

export default function optionsExtension(pi: ExtensionAPI): void {
  const state = createState();

  pi.on(SESSION_START_EVENT, (_event, ctx) => {
    setActiveModel(state, getContextModel(ctx));
    renderOptionsStatus(state, ctx);
  });

  pi.on(MODEL_SELECT_EVENT, (event, ctx) => {
    setActiveModel(state, {
      provider: event.model.provider,
      id: event.model.id,
    });
    renderOptionsStatus(state, ctx);
  });

  pi.on(BEFORE_PROVIDER_REQUEST_EVENT, (event, ctx) =>
    patchPayload(state, event.payload, ctx),
  );

  pi.registerCommand(COMMAND_NAME, {
    description: COMMAND_DESCRIPTION,
    handler: async (_args: string, ctx: ExtensionContext) => {
      await openCommand(state, ctx);
    },
  });
}
