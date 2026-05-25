import { spawn } from "node:child_process";
import type { ActiveModel } from "../core/state";
import { getModelKey } from "../core/state";
import { guardedDrainLineBuffer } from "./buffer";
import { parseStdoutLine, type ParsedStdoutLine } from "./events";
import type { SpawnWorkerOptions, WorkerResult } from "./types";

const DISABLED_WORKER_TIMEOUT_MS = 0;
const GRACEFUL_KILL_DELAY_MS = 1000;
const SIGTERM = "SIGTERM";
const SIGKILL = "SIGKILL";

export async function spawnWorker(
  options: SpawnWorkerOptions,
): Promise<WorkerResult> {
  const start = Date.now();
  const { timeoutMs } = options;
  const child = spawn("pi", buildWorkerArgs(options.model, options.prompt), {
    cwd: options.cwd,
    stdio: ["ignore", "pipe", "pipe"],
  });

  return await new Promise<WorkerResult>((resolve) => {
    let finished = false;
    let stdout = "";
    let stderr = "";
    let stdoutBuffer = "";
    let assistantText = "";

    const finish = (result: WorkerResult): void => {
      if (finished) return;
      finished = true;
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      resolve(result);
    };

    const emitUpdate = (update: ParsedStdoutLine): void => {
      if (update.nextAssistantText !== undefined) {
        assistantText = update.nextAssistantText;
      }
      if (update.emit) {
        options.onUpdate?.(update.emit);
      }
    };

    const flushStdoutLine = (line: string): void => {
      emitUpdate(parseStdoutLine(line, assistantText));
    };

    const cancel = createWorkerCancel(child);
    options.onStart?.(cancel);

    const timeoutId = createWorkerTimeout(timeoutMs, cancel, () => {
      finish({
        status: "error",
        stdout,
        stderr: stderr || `Worker timed out after ${timeoutMs}ms`,
        assistantText,
        code: null,
        durationMs: Date.now() - start,
      });
    });

    child.on("error", (error) => {
      finish({
        status: "error",
        stdout,
        stderr: error.message,
        assistantText,
        code: null,
        durationMs: Date.now() - start,
      });
    });

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
      stdoutBuffer += chunk;

      const drained = guardedDrainLineBuffer(stdoutBuffer);
      stdoutBuffer = drained.rest;

      if (drained.overflowWarning) {
        options.onUpdate?.({ stdoutLine: drained.overflowWarning });
      }

      for (const line of drained.lines) {
        flushStdoutLine(line);
      }
    });

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
      for (const line of chunk.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        options.onUpdate?.({ stderrLine: trimmed });
      }
    });

    child.on("close", (code) => {
      if (stdoutBuffer.trim()) {
        const drained = guardedDrainLineBuffer(stdoutBuffer);
        if (drained.overflowWarning) {
          options.onUpdate?.({ stdoutLine: drained.overflowWarning });
        }
        for (const line of drained.lines) {
          flushStdoutLine(line);
        }
        if (!drained.overflowWarning && drained.rest.trim()) {
          flushStdoutLine(drained.rest);
        }
      }

      finish({
        status: code === 0 ? "success" : "error",
        stdout,
        stderr,
        assistantText,
        code,
        durationMs: Date.now() - start,
      });
    });
  });
}

export function buildWorkerArgs(model: ActiveModel, prompt: string): string[] {
  return [
    "--no-session",
    "--model",
    getModelKey(model),
    "--mode",
    "json",
    prompt,
  ];
}

function createWorkerCancel(child: ReturnType<typeof spawn>): () => void {
  return () => {
    if (child.killed) return;
    child.kill(SIGTERM);
    setTimeout(() => {
      if (!child.killed) {
        child.kill(SIGKILL);
      }
    }, GRACEFUL_KILL_DELAY_MS);
  };
}

function createWorkerTimeout(
  timeoutMs: number,
  cancel: () => void,
  onTimeout: () => void,
): ReturnType<typeof setTimeout> | undefined {
  if (timeoutMs <= DISABLED_WORKER_TIMEOUT_MS) return undefined;

  return setTimeout(() => {
    cancel();
    onTimeout();
  }, timeoutMs);
}
