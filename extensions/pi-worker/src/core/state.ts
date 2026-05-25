import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

const RECENT_OUTPUT_LINE_LIMIT = 6;

// ExtensionState is intentionally mutable session state.
// It is owned by the extension and mutated by event handlers during a pi session.
// No immutability or reducer pattern here — state is a simple carrier between
// extension lifecycle, command handlers, and the worker process.

export interface ActiveModel {
  provider: string;
  id: string;
}

export type WorkerMode = "task" | "plan" | "implement" | "review";

export interface WorkerRunState {
  model: ActiveModel;
  prompt: string;
  startedAt: number;
  assistantText: string;
  stdoutLines: string[];
  stderrLines: string[];
  cancel?: () => void;
}

export interface ExtensionState {
  activeModel?: ActiveModel;
  workerMode?: WorkerMode;
  workerTimeoutMs?: number;
  worker?: WorkerRunState;
}

export function createState(
  settings: Pick<ExtensionState, "workerTimeoutMs"> = {},
): ExtensionState {
  return { workerMode: "task", ...settings };
}

export function getContextModel(
  ctx: ExtensionContext,
): ActiveModel | undefined {
  if (!ctx.model) return undefined;
  return {
    provider: ctx.model.provider,
    id: ctx.model.id,
  };
}

export function setActiveModel(
  state: ExtensionState,
  model: ActiveModel | undefined,
): void {
  setOptional(state, "activeModel", model);
}

export function getModelKey(model: ActiveModel): string {
  return `${model.provider}/${model.id}`;
}

export function setWorkerMode(state: ExtensionState, mode: WorkerMode): void {
  state.workerMode = mode;
}

export function setWorkerTimeout(
  state: ExtensionState,
  timeoutMs: number | undefined,
): void {
  setOptional(state, "workerTimeoutMs", timeoutMs);
}

export function isWorkerBusy(state: ExtensionState): boolean {
  return state.worker !== undefined;
}

export function startWorkerRun(
  state: ExtensionState,
  model: ActiveModel,
  prompt: string,
): WorkerRunState {
  const worker: WorkerRunState = {
    model,
    prompt,
    startedAt: Date.now(),
    assistantText: "",
    stdoutLines: [],
    stderrLines: [],
  };
  state.worker = worker;
  return worker;
}

export function clearWorkerRun(state: ExtensionState): void {
  delete state.worker;
}

export function setWorkerCancel(
  state: ExtensionState,
  cancel: (() => void) | undefined,
): void {
  if (!state.worker) return;
  setOptional(state.worker, "cancel", cancel);
}

export function setWorkerAssistantText(
  state: ExtensionState,
  assistantText: string,
): void {
  if (!state.worker) return;
  state.worker.assistantText = assistantText;
}

export function appendWorkerStdout(state: ExtensionState, line: string): void {
  if (!state.worker) return;
  appendRecentUniqueLine(
    state.worker.stdoutLines,
    line,
    RECENT_OUTPUT_LINE_LIMIT,
  );
}

export function appendWorkerStderr(state: ExtensionState, line: string): void {
  if (!state.worker) return;
  appendRecentUniqueLine(
    state.worker.stderrLines,
    line,
    RECENT_OUTPUT_LINE_LIMIT,
  );
}

function setOptional<T extends object, K extends keyof T>(
  target: T,
  key: K,
  value: T[K] | undefined,
): void {
  if (value !== undefined) {
    target[key] = value;
    return;
  }
  delete target[key];
}

function appendRecentUniqueLine(
  target: string[],
  line: string,
  limit: number,
): void {
  const trimmed = line.trim();
  if (!trimmed || target[target.length - 1] === trimmed) return;

  target.push(trimmed);
  while (target.length > limit) {
    target.shift();
  }
}
