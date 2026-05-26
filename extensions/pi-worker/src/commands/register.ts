import type {
  ExtensionAPI,
  ExtensionCommandContext,
} from "@earendil-works/pi-coding-agent";
import { isWorkerBusy, type ExtensionState } from "../core/session";
import { WORKER_MESSAGES } from "../ui/copy";
import { compileWorkerRequest } from "../worker/request";
import {
  openAndPersistWorkerPanel,
  runWorkerRequest,
} from "../worker/run-flow";

const COMMAND_NAME = "worker";
const COMMAND_DESCRIPTION = "Run a task in an isolated worker session";
const WARNING_LEVEL = "warning";
const ERROR_LEVEL = "error";

export function registerWorkerCommand(
  pi: ExtensionAPI,
  state: ExtensionState,
): void {
  pi.registerCommand(COMMAND_NAME, {
    description: COMMAND_DESCRIPTION,
    handler: async (_args: string, ctx: ExtensionCommandContext) => {
      if (isWorkerBusy(state)) {
        ctx.ui.notify(WORKER_MESSAGES.busy, WARNING_LEVEL);
        return;
      }

      if (!ctx.isIdle()) {
        ctx.ui.notify(WORKER_MESSAGES.waitForIdle, WARNING_LEVEL);
        return;
      }

      const draft = await openAndPersistWorkerPanel(state, ctx);
      if (!draft) return;

      const request = compileWorkerRequest(draft);
      if (!request) {
        ctx.ui.notify(WORKER_MESSAGES.promptEmpty, ERROR_LEVEL);
        return;
      }

      await runWorkerRequest(pi, state, ctx, request);
    },
  });
}
