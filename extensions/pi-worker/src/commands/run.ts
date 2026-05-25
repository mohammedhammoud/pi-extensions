import type {
  ExtensionAPI,
  ExtensionCommandContext,
} from "@earendil-works/pi-coding-agent";
import { saveWorkerOutput } from "../core/output";
import {
  appendWorkerStderr,
  appendWorkerStdout,
  clearWorkerRun,
  getContextModel,
  getModelKey,
  setWorkerAssistantText,
  setWorkerCancel,
  setWorkerMode,
  setWorkerTimeout,
  startWorkerRun,
  type ActiveModel,
  type ExtensionState,
  type WorkerMode,
} from "../core/state";
import { spawnWorker } from "../worker/spawn";
import type { WorkerResult } from "../worker/types";
import { openWorkerPanel, type WorkerTimeoutMs } from "../options/panel/open";
import { clearWorkerUi, renderWorkerUi, startWorkerWidget } from "../ui/status";
import { saveWorkerSettings } from "../store";
import {
  createWorkerFinishMessage,
  createWorkerStartMessage,
} from "../ui/report";

export type WorkerSourceType = "new-task" | "refine-output";

const PROMPT_EMPTY_MESSAGE = "Empty task";
const INFO_LEVEL = "info";
const ERROR_LEVEL = "error";

export async function openAndPersistWorkerPanel(
  state: ExtensionState,
  ctx: ExtensionCommandContext,
  promptPrefill: string | undefined,
) {
  const currentModel = getContextModel(ctx) ?? state.activeModel;
  const persistTimeout = (timeoutMs: WorkerTimeoutMs): void => {
    setWorkerTimeout(state, timeoutMs);
    saveWorkerSettings(timeoutMs !== undefined ? { timeoutMs } : {});
  };

  const panel = await openWorkerPanel(
    ctx,
    currentModel,
    state.workerMode ?? "task",
    promptPrefill,
    state.workerTimeoutMs ?? 0,
    (mode) => setWorkerMode(state, mode),
    persistTimeout,
  );
  if (!panel) return undefined;

  setWorkerMode(state, panel.mode);
  persistTimeout(panel.timeoutMs);
  return panel;
}

export async function runWorkerTask(
  pi: ExtensionAPI,
  state: ExtensionState,
  ctx: ExtensionCommandContext,
  model: ActiveModel,
  mode: WorkerMode,
  timeoutMs: WorkerTimeoutMs,
  task: string | undefined,
  sourceType: WorkerSourceType,
): Promise<boolean> {
  if (!task) {
    ctx.ui.notify(PROMPT_EMPTY_MESSAGE, ERROR_LEVEL);
    return false;
  }

  setWorkerMode(state, mode);

  const worker = startWorkerRun(state, model, task);
  const stopWidget = startWorkerWidget(ctx, state);
  pi.sendMessage(createWorkerStartMessage(getModelKey(model), task));

  try {
    const result = await spawnWorker({
      cwd: ctx.cwd,
      model,
      prompt: task,
      timeoutMs,
      onStart: (cancel) => {
        setWorkerCancel(state, cancel);
      },
      onUpdate: (update) => {
        if (update.assistantText !== undefined) {
          setWorkerAssistantText(state, update.assistantText);
        }
        if (update.stdoutLine) {
          appendWorkerStdout(state, update.stdoutLine);
        }
        if (update.stderrLine) {
          appendWorkerStderr(state, update.stderrLine);
        }
        renderWorkerUi(ctx, state);
      },
    });

    await reportWorkerResult(
      pi,
      ctx,
      worker.model,
      mode,
      task,
      sourceType,
      result,
    );
    return true;
  } finally {
    stopWidget();
    clearWorkerRun(state);
    clearWorkerUi(ctx);
  }
}

async function reportWorkerResult(
  pi: ExtensionAPI,
  ctx: ExtensionCommandContext,
  model: ActiveModel,
  mode: WorkerMode,
  task: string,
  sourceType: WorkerSourceType,
  result: WorkerResult,
): Promise<void> {
  const output = await saveWorkerOutput(
    ctx.cwd,
    getModelKey(model),
    mode,
    task,
    result,
    sourceType,
  );

  pi.sendMessage(
    createWorkerFinishMessage(
      getModelKey(model),
      task,
      output.relativePath,
      result,
    ),
  );
  ctx.ui.notify(
    result.status === "success"
      ? `Worker finished: ${output.relativePath}`
      : `Worker failed: ${output.relativePath}`,
    result.status === "success" ? INFO_LEVEL : ERROR_LEVEL,
  );
}
