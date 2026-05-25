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
} from "./core/state";
import { clearWorkerUi } from "./ui/status";
import { loadWorkerSettings } from "./store";
import { createWorkerMessageRenderer, WORKER_MESSAGE_TYPE } from "./ui/report";
import { registerWorkerCommand } from "./commands/register";

const SESSION_START_EVENT = "session_start";
const SESSION_SHUTDOWN_EVENT = "session_shutdown";
const MODEL_SELECT_EVENT = "model_select";
const INPUT_EVENT = "input";
const BUSY_MESSAGE = "Worker already running";
const WARNING_LEVEL = "warning";

export default function workerExtension(pi: ExtensionAPI): void {
  const workerSettings = loadWorkerSettings();
  const state = createState(
    workerSettings.timeoutMs !== undefined
      ? { workerTimeoutMs: workerSettings.timeoutMs }
      : {},
  );

  pi.registerMessageRenderer(
    WORKER_MESSAGE_TYPE,
    createWorkerMessageRenderer(),
  );

  pi.on(SESSION_START_EVENT, (_event, ctx) => {
    setActiveModel(state, getContextModel(ctx));
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
    ctx.ui.notify(BUSY_MESSAGE, WARNING_LEVEL);
    return { action: "handled" };
  });

  pi.on(SESSION_SHUTDOWN_EVENT, () => {
    state.worker?.cancel?.();
    clearWorkerRun(state);
  });

  registerWorkerCommand(pi, state);
}
