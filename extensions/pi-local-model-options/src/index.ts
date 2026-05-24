import type {
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { openLocalCommand } from "./commands/local.js";
import { getContextModel } from "./core/model.js";
import { createState, setActiveModel } from "./core/state.js";
import { patchPayload } from "./options/request.js";
import { renderStatus } from "./options/status.js";

export default function localOptionsExtension(pi: ExtensionAPI): void {
  const state = createState();

  pi.on("session_start", (_event, ctx) => {
    setActiveModel(state, getContextModel(ctx));
    renderStatus(state, ctx);
  });

  pi.on("model_select", (event, ctx) => {
    setActiveModel(state, {
      provider: event.model.provider,
      id: event.model.id,
    });
    renderStatus(state, ctx);
  });

  pi.on("before_provider_request", (event, ctx) =>
    patchPayload(state, event.payload, ctx),
  );

  pi.registerCommand("local", {
    description: "Configure local options for the active model",
    handler: async (_args: string, ctx: ExtensionContext) => {
      await openLocalCommand(state, ctx);
    },
  });
}
