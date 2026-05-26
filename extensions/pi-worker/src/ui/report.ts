import type { MessageRenderer } from "@earendil-works/pi-coding-agent";
import { Box, Text } from "@earendil-works/pi-tui";
import type { WorkerRunState } from "../core/session";
import { getModelKey } from "../core/session";
import { truncateInline } from "../shared/format";
import type { WorkerResult } from "../worker/types";
import {
  WORKER_FIELD_LABELS,
  WORKER_MESSAGES,
  WORKER_MESSAGE_TITLES,
  WORKER_UI_KEY,
} from "./copy";

const MS_PER_SECOND = 1000;
const MAX_OUTPUT_CHARS = 280;
const MAX_WIDGET_CHARS = 240;
const RECENT_ACTIVITY_LINES = 3;

interface WorkerMessageDetails {
  kind: "start" | "finish" | "list";
  model?: string;
  prompt?: string;
  status?: "success" | "error";
  durationMs?: number;
  outputPath?: string;
  planPath?: string;
  planLabel?: string;
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
        ? WORKER_MESSAGE_TITLES.report
        : details.kind === "list"
          ? WORKER_MESSAGE_TITLES.outputs
          : WORKER_MESSAGE_TITLES.started;

    const lines = [
      theme.fg(tone, theme.bold(title)),
      details.model
        ? `${theme.fg("muted", WORKER_FIELD_LABELS.model)} ${details.model}`
        : undefined,
      details.outputPath
        ? `${theme.fg("muted", WORKER_FIELD_LABELS.output)} ${details.outputPath}`
        : undefined,
      details.planPath
        ? `${theme.fg("muted", details.planLabel ?? WORKER_FIELD_LABELS.plan)} ${details.planPath}`
        : undefined,
      details.summary ?? String(message.content),
    ];

    if (expanded && details.prompt) {
      lines.push(
        theme.fg("dim", `${WORKER_FIELD_LABELS.prompt}${details.prompt}`),
      );
    }

    if (expanded && details.output) {
      lines.push("");
      lines.push(details.output);
    }

    if (expanded && details.stderr) {
      lines.push("");
      lines.push(
        theme.fg("dim", `${WORKER_FIELD_LABELS.stderr}${details.stderr}`),
      );
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
    customType: WORKER_UI_KEY,
    content: WORKER_MESSAGES.running,
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
  planPath?: string,
  planLabel?: string,
): {
  customType: string;
  content: string;
  display: true;
  details: WorkerMessageDetails;
} {
  const fullOutput = getFullReportOutput(result);
  return {
    customType: WORKER_UI_KEY,
    content: [
      `Output path: ${outputPath}`,
      planPath ? `${planLabel ?? "Plan path"}: ${planPath}` : undefined,
      "",
      fullOutput,
    ]
      .filter(Boolean)
      .join("\n"),
    display: true,
    details: {
      kind: "finish",
      model: modelKey,
      prompt,
      status: result.status,
      durationMs: result.durationMs,
      outputPath,
      ...(planPath ? { planPath } : {}),
      ...(planLabel ? { planLabel } : {}),
      summary: formatReport(
        modelKey,
        outputPath,
        result,
        fullOutput,
        planPath,
        planLabel,
      ),
      output: fullOutput,
      stderr: truncateInline(result.stderr, MAX_OUTPUT_CHARS),
    },
  };
}

function formatReport(
  modelKey: string,
  outputPath: string,
  result: WorkerResult,
  fullOutput: string,
  planPath?: string,
  planLabel?: string,
): string {
  const durationSec = (result.durationMs / MS_PER_SECOND).toFixed(1);
  const output = truncateInline(fullOutput, MAX_OUTPUT_CHARS);

  return [
    `Model: ${modelKey}`,
    `Status: ${result.status}`,
    `Output: ${outputPath}`,
    planPath ? `${planLabel ?? "Plan"}: ${planPath}` : undefined,
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
    lines.push(WORKER_FIELD_LABELS.activity);
    for (const line of run.stdoutLines.slice(-RECENT_ACTIVITY_LINES)) {
      lines.push(`· ${line}`);
    }
  }

  if (run.stderrLines.length > 0) {
    lines.push(
      `${WORKER_FIELD_LABELS.stderr}${run.stderrLines[run.stderrLines.length - 1]}`,
    );
  }

  return lines;
}

function getFullReportOutput(result: WorkerResult): string {
  const source = result.assistantText || result.stderr || result.stdout;
  const text = source.trim();
  return text || formatEmptyReportOutput(result);
}

function formatEmptyReportOutput(result: WorkerResult): string {
  return `Worker completed with status=${result.status} code=${result.code ?? "null"}.`;
}
