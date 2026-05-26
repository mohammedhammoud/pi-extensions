import type {
  ExtensionAPI,
  ExtensionCommandContext,
} from "@earendil-works/pi-coding-agent";
import { saveWorkerOutput } from "../artifacts/outputs/store";
import {
  overwriteWorkerPlan,
  saveWorkerPlan,
  type WorkerPlan,
} from "../artifacts/plans/store";
import { formatRelativePath } from "../shared/format";
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
} from "../core/session";
import { saveWorkerSettings } from "../core/storage/settings";
import { openWorkerPanel } from "../options/panel/open";
import { WORKER_MESSAGES } from "../ui/copy";
import {
  createWorkerFinishMessage,
  createWorkerStartMessage,
} from "../ui/report";
import { clearWorkerUi, renderWorkerUi, startWorkerWidget } from "../ui/status";
import { spawnWorker } from "./spawn";
import type { WorkerRequest } from "./request";
import type { WorkerResult } from "./types";

const INFO_LEVEL = "info";
const ERROR_LEVEL = "error";

export async function openAndPersistWorkerPanel(
  state: ExtensionState,
  ctx: ExtensionCommandContext,
) {
  const currentModel = getContextModel(ctx) ?? state.activeModel;
  const persistTimeout = (timeoutMs: number): void => {
    setWorkerTimeout(state, timeoutMs);
    saveWorkerSettings(timeoutMs !== undefined ? { timeoutMs } : {});
  };

  const draft = await openWorkerPanel(
    ctx,
    currentModel,
    state.workerMode ?? "task",
    state.workerTimeoutMs ?? 0,
    (mode) => setWorkerMode(state, mode),
    persistTimeout,
  );
  if (!draft) return undefined;

  setWorkerMode(state, draft.mode);
  persistTimeout(draft.timeoutMs);
  return draft;
}

export async function runWorkerRequest(
  pi: ExtensionAPI,
  state: ExtensionState,
  ctx: ExtensionCommandContext,
  request: WorkerRequest,
): Promise<boolean> {
  if (!request.compiledPrompt) {
    ctx.ui.notify(WORKER_MESSAGES.promptEmpty, ERROR_LEVEL);
    return false;
  }

  setWorkerMode(state, request.mode);

  const worker = startWorkerRun(state, request.model, request.compiledPrompt);
  const stopWidget = startWorkerWidget(ctx, state);
  pi.sendMessage(
    createWorkerStartMessage(getModelKey(request.model), request.rawPrompt),
  );

  try {
    const result = await spawnWorker({
      cwd: ctx.cwd,
      model: request.model,
      prompt: request.compiledPrompt,
      timeoutMs: request.timeoutMs,
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

    await reportWorkerResult(pi, ctx, worker.model, request, result);
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
  request: WorkerRequest,
  result: WorkerResult,
): Promise<void> {
  const nextPlan = await persistPlan(
    ctx.cwd,
    getModelKey(model),
    request,
    result,
  );
  const output = await saveWorkerOutput(
    ctx.cwd,
    getModelKey(model),
    request.mode,
    request.rawPrompt,
    result,
    nextPlan?.path ?? request.selectedPlan?.path,
  );
  const reportPlan = nextPlan ?? request.selectedPlan;
  const planPath = reportPlan
    ? formatRelativePath(ctx.cwd, reportPlan.path)
    : undefined;
  const planLabel = getPlanLabel(request.mode, request.selectedPlan, nextPlan);

  pi.sendMessage(
    createWorkerFinishMessage(
      getModelKey(model),
      request.rawPrompt,
      output.relativePath,
      result,
      planPath,
      planLabel,
    ),
  );
  ctx.ui.notify(
    formatCompletionNotice(result.status, output.relativePath, planPath),
    result.status === "success" ? INFO_LEVEL : ERROR_LEVEL,
  );
}

async function persistPlan(
  cwd: string,
  modelKey: string,
  request: WorkerRequest,
  result: WorkerResult,
): Promise<WorkerPlan | undefined> {
  if (result.status !== "success") {
    return request.selectedPlan;
  }

  if (request.mode === "plan") {
    return await saveWorkerPlan(
      cwd,
      modelKey,
      request.compiledPrompt,
      result,
      request.rawPrompt,
    );
  }

  if (request.mode === "refine" && request.selectedPlan) {
    return await overwriteWorkerPlan(
      request.selectedPlan,
      modelKey,
      request.compiledPrompt,
      result,
      request.rawPrompt,
    );
  }

  return request.selectedPlan;
}

function getPlanLabel(
  mode: WorkerRequest["mode"],
  selectedPlan?: WorkerPlan,
  nextPlan?: WorkerPlan,
): string | undefined {
  if (mode === "plan" && nextPlan) return "created plan";
  if (mode === "refine" && nextPlan) return "refined plan";
  if ((mode === "implement" || mode === "review") && selectedPlan) {
    return "used plan";
  }
  if (selectedPlan || nextPlan) return "plan";
  return undefined;
}

function formatCompletionNotice(
  status: WorkerResult["status"],
  outputPath: string,
  planPath?: string,
): string {
  const prefix = status === "success" ? "Worker finished" : "Worker failed";
  return planPath
    ? `${prefix}: ${outputPath} · plan ${planPath}`
    : `${prefix}: ${outputPath}`;
}
