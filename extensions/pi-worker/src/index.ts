import type {
  ExtensionAPI,
  InputEventResult,
} from "@earendil-works/pi-coding-agent";
import {
  clearWorkerRun,
  createState,
  getContextModel,
  isWorkerBusy,
  setActiveModel,
} from "./core/session";
import { loadWorkerSettings } from "./core/storage/settings";
import { registerWorkerCommand } from "./commands/register";
import { WORKER_MESSAGES, WORKER_UI_KEY } from "./ui/copy";
import { installWorkerEditor } from "./ui/editor";
import { createWorkerMessageRenderer } from "./ui/report";
import { clearWorkerUi } from "./ui/status";

const SESSION_START_EVENT = "session_start";
const SESSION_SHUTDOWN_EVENT = "session_shutdown";
const MODEL_SELECT_EVENT = "model_select";
const INPUT_EVENT = "input";
const WARNING_LEVEL = "warning";

export default function workerExtension(pi: ExtensionAPI): void {
  const workerSettings = loadWorkerSettings();
  const state = createState(
    workerSettings.timeoutMs !== undefined
      ? { workerTimeoutMs: workerSettings.timeoutMs }
      : {},
  );
  let restoreWorkerEditor: (() => void) | undefined;

  pi.registerMessageRenderer(WORKER_UI_KEY, createWorkerMessageRenderer());

  pi.on(SESSION_START_EVENT, (_event, ctx) => {
    restoreWorkerEditor?.();
    setActiveModel(state, getContextModel(ctx));
    restoreWorkerEditor = installWorkerEditor(ctx, state);
    clearWorkerUi(ctx);
  });

  pi.on(MODEL_SELECT_EVENT, (event) => {
    setActiveModel(state, {
      provider: event.model.provider,
      id: event.model.id,
    });
  });

  pi.on(INPUT_EVENT, (_event, ctx): InputEventResult | void => {
    if (!isWorkerBusy(state)) return;
    ctx.ui.notify(WORKER_MESSAGES.busy, WARNING_LEVEL);
    return { action: "handled" };
  });

  pi.on(SESSION_SHUTDOWN_EVENT, () => {
    restoreWorkerEditor?.();
    restoreWorkerEditor = undefined;
    state.worker?.cancel?.();
    clearWorkerRun(state);
  });

  registerWorkerCommand(pi, state);
}
