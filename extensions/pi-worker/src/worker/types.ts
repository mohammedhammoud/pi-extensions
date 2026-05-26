import type { ActiveModel } from "../core/session";

export interface WorkerUpdate {
  assistantText?: string;
  stdoutLine?: string;
  stderrLine?: string;
}

export interface WorkerResult {
  status: "success" | "error";
  stdout: string;
  stderr: string;
  assistantText: string;
  code: number | null;
  durationMs: number;
}

export interface SpawnWorkerOptions {
  cwd: string;
  model: ActiveModel;
  prompt: string;
  timeoutMs: number | undefined;
  onStart?(cancel: () => void): void;
  onUpdate?(update: WorkerUpdate): void;
}
