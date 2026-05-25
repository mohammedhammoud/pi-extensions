import type { MessageRenderer } from "@earendil-works/pi-coding-agent";
import { Box, Text } from "@earendil-works/pi-tui";
import type { WorkerResult } from "../worker/types";
import type { WorkerRunState } from "../core/state";
import { getModelKey } from "../core/state";

const MS_PER_SECOND = 1000;
const MAX_OUTPUT_CHARS = 280;
const MAX_WIDGET_CHARS = 240;
const RECENT_ACTIVITY_LINES = 3;
const WORKER_MESSAGE_TYPE = "pi-worker";
const WORKER_REPORT_TITLE = "Worker report";
const WORKER_OUTPUTS_TITLE = "Worker outputs";
const WORKER_STARTED_TITLE = "Worker started";
const RUNNING_MESSAGE = "Running in isolated worker session.";
const MODEL_LABEL = "model";
const OUTPUT_LABEL = "output";
const PROMPT_LABEL = "prompt: ";
const STDERR_LABEL = "stderr: ";
const ACTIVITY_LABEL = "activity";

interface WorkerMessageDetails {
  kind: "start" | "finish" | "list";
  model?: string;
  prompt?: string;
  status?: "success" | "error";
  durationMs?: number;
  outputPath?: string;
  summary?: string;
  output?: string;
  stderr?: string;
}

export function createWorkerMessageRenderer(): MessageRenderer<WorkerMessageDetails> {
  return (message, { expanded }, theme) => {
    const details = message.details as WorkerMessageDetails | undefined;
    if (!details) {
      return new Text(String(message.content), 0, 0);
    }

    const tone =
      details.kind === "finish"
        ? details.status === "success"
          ? "success"
          : "error"
        : "accent";
    const title =
      details.kind === "finish"
        ? WORKER_REPORT_TITLE
        : details.kind === "list"
          ? WORKER_OUTPUTS_TITLE
          : WORKER_STARTED_TITLE;

    const lines = [
      theme.fg(tone, theme.bold(title)),
      details.model
        ? `${theme.fg("muted", MODEL_LABEL)} ${details.model}`
        : undefined,
      details.outputPath
        ? `${theme.fg("muted", OUTPUT_LABEL)} ${details.outputPath}`
        : undefined,
      details.summary ?? String(message.content),
    ];

    if (expanded && details.prompt) {
      lines.push(theme.fg("dim", `${PROMPT_LABEL}${details.prompt}`));
    }

    if (expanded && details.output) {
      lines.push("");
      lines.push(details.output);
    }

    if (expanded && details.stderr) {
      lines.push("");
      lines.push(theme.fg("dim", `${STDERR_LABEL}${details.stderr}`));
    }

    const box = new Box(1, 1, (text) => theme.bg("customMessageBg", text));
    box.addChild(new Text(lines.filter(Boolean).join("\n"), 0, 0));
    return box;
  };
}

export function createWorkerStartMessage(
  modelKey: string,
  prompt: string,
): {
  customType: string;
  content: string;
  display: true;
  details: WorkerMessageDetails;
} {
  return {
    customType: WORKER_MESSAGE_TYPE,
    content: RUNNING_MESSAGE,
    display: true,
    details: {
      kind: "start",
      model: modelKey,
      prompt,
    },
  };
}

export function createWorkerFinishMessage(
  modelKey: string,
  prompt: string,
  outputPath: string,
  result: WorkerResult,
): {
  customType: string;
  content: string;
  display: true;
  details: WorkerMessageDetails;
} {
  const fullOutput = getFullReportOutput(result);
  return {
    customType: WORKER_MESSAGE_TYPE,
    content: [`Output path: ${outputPath}`, "", fullOutput].join("\n"),
    display: true,
    details: {
      kind: "finish",
      model: modelKey,
      prompt,
      status: result.status,
      durationMs: result.durationMs,
      outputPath,
      summary: formatReport(modelKey, outputPath, result, fullOutput),
      output: fullOutput,
      stderr: truncateInline(result.stderr, MAX_OUTPUT_CHARS),
    },
  };
}

export function createWorkerListMessage(content: string): {
  customType: string;
  content: string;
  display: true;
  details: WorkerMessageDetails;
} {
  return {
    customType: WORKER_MESSAGE_TYPE,
    content,
    display: true,
    details: {
      kind: "list",
      summary: content,
      output: content,
    },
  };
}

function formatReport(
  modelKey: string,
  outputPath: string,
  result: WorkerResult,
  fullOutput: string,
): string {
  const durationSec = (result.durationMs / MS_PER_SECOND).toFixed(1);
  const output = truncateInline(fullOutput, MAX_OUTPUT_CHARS);

  return [
    `Model: ${modelKey}`,
    `Status: ${result.status}`,
    `Output: ${outputPath}`,
    output ? `Output: ${output}` : undefined,
    `Duration: ${durationSec}s`,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

export function formatWorkerWidget(run: WorkerRunState): string[] {
  const lines = [
    getModelKey(run.model),
    `${((Date.now() - run.startedAt) / MS_PER_SECOND).toFixed(1)}s`,
  ];

  const preview = truncateInline(run.assistantText, MAX_WIDGET_CHARS);
  if (preview) {
    lines.push(preview);
  }

  if (run.stdoutLines.length > 0) {
    lines.push(ACTIVITY_LABEL);
    for (const line of run.stdoutLines.slice(-RECENT_ACTIVITY_LINES)) {
      lines.push(`· ${line}`);
    }
  }

  if (run.stderrLines.length > 0) {
    lines.push(`${STDERR_LABEL}${run.stderrLines[run.stderrLines.length - 1]}`);
  }

  return lines;
}

export { WORKER_MESSAGE_TYPE };

function getFullReportOutput(result: WorkerResult): string {
  const source = result.assistantText || result.stderr || result.stdout;
  const text = source.trim();
  return text || formatEmptyReportOutput(result);
}

function formatEmptyReportOutput(result: WorkerResult): string {
  return `Worker completed with status=${result.status} code=${result.code ?? "null"}.`;
}

function truncateInline(value: string, limit: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  return normalized.length > limit
    ? `${normalized.slice(0, limit)}...`
    : normalized;
}
