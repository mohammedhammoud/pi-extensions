import type {
  ExtensionAPI,
  ExtensionCommandContext,
} from "@earendil-works/pi-coding-agent";
import { isWorkerBusy, type ExtensionState } from "../core/state";
import { buildWorkerTask } from "./task";
import { openAndPersistWorkerPanel, runWorkerTask } from "./run";

const COMMAND_NAME = "worker";
const COMMAND_DESCRIPTION = "Run a task in an isolated worker session";
const BUSY_MESSAGE = "Worker already running";
const STREAMING_MESSAGE = "Wait for current turn to finish";
const WARNING_LEVEL = "warning";

export function registerWorkerCommand(
  pi: ExtensionAPI,
  state: ExtensionState,
): void {
  pi.registerCommand(COMMAND_NAME, {
    description: COMMAND_DESCRIPTION,
    handler: async (args: string, ctx: ExtensionCommandContext) => {
      if (isWorkerBusy(state)) {
        ctx.ui.notify(BUSY_MESSAGE, WARNING_LEVEL);
        return;
      }

      if (!ctx.isIdle()) {
        ctx.ui.notify(STREAMING_MESSAGE, WARNING_LEVEL);
        return;
      }

      const panel = await openAndPersistWorkerPanel(state, ctx, undefined);
      if (!panel) return;

      await runWorkerTask(
        pi,
        state,
        ctx,
        panel.model,
        panel.mode,
        panel.timeoutMs,
        buildWorkerTask(panel.mode, panel.prompt),
        panel.sourceType,
      );
    },
  });
}
