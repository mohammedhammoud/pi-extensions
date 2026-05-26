import type { WorkerUpdate } from "./types";
import { summarizeToolStart } from "./tools";

export interface ParsedStdoutLine {
  nextAssistantText?: string;
  emit?: WorkerUpdate;
}

interface WorkerEvent {
  type: string;
  toolName?: string;
  args?: unknown;
  isError?: boolean;
  message?: {
    role: string;
    content?: unknown;
  };
  assistantMessageEvent?: { type: string; delta?: string };
}

export function parseStdoutLine(
  line: string,
  assistantText: string,
): ParsedStdoutLine {
  const trimmed = line.trim();
  if (!trimmed) return {};

  const event = parseEvent(trimmed);
  if (!event) {
    return { emit: { stdoutLine: trimmed } };
  }

  return (
    parseAssistantDeltaEvent(event, assistantText) ??
    parseAssistantMessageEndEvent(event, assistantText) ??
    parseLifecycleEvent(event) ??
    parseToolEvent(event) ??
    {}
  );
}

export function extractAssistantText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  const parts: string[] = [];
  for (const item of content) {
    if (!item || typeof item !== "object") continue;
    const part = item as { type?: string; text?: string };
    if (part.type === "text" && typeof part.text === "string") {
      parts.push(part.text);
    }
  }

  return parts.join("\n").trim();
}

export function parseLifecycleEvent(event: {
  type: string;
  message?: { role: string };
}): ParsedStdoutLine | undefined {
  if (event.type === "message_start" && event.message?.role === "assistant") {
    return { emit: { stdoutLine: "assistant thinking" } };
  }
  if (event.type === "agent_start") {
    return { emit: { stdoutLine: "worker started" } };
  }
  if (event.type === "agent_end") {
    return { emit: { stdoutLine: "worker finished" } };
  }
  return undefined;
}

function parseEvent(line: string): WorkerEvent | undefined {
  try {
    return JSON.parse(line) as WorkerEvent;
  } catch {
    return undefined;
  }
}

function parseAssistantDeltaEvent(
  event: WorkerEvent,
  assistantText: string,
): ParsedStdoutLine | undefined {
  if (
    event.type !== "message_update" ||
    event.assistantMessageEvent?.type !== "text_delta" ||
    typeof event.assistantMessageEvent.delta !== "string"
  ) {
    return undefined;
  }

  const nextAssistantText = assistantText + event.assistantMessageEvent.delta;
  return {
    nextAssistantText,
    emit: nextAssistantText.trim()
      ? {
          assistantText: nextAssistantText,
          stdoutLine: "assistant writing",
        }
      : {
          assistantText: nextAssistantText,
        },
  };
}

function parseAssistantMessageEndEvent(
  event: WorkerEvent,
  assistantText: string,
): ParsedStdoutLine | undefined {
  if (event.type !== "message_end" || event.message?.role !== "assistant") {
    return undefined;
  }

  const nextAssistantText =
    extractAssistantText(event.message.content) || assistantText;
  if (!nextAssistantText) return {};

  return {
    nextAssistantText,
    emit: {
      assistantText: nextAssistantText,
      stdoutLine: "assistant finished",
    },
  };
}

function parseToolEvent(event: WorkerEvent): ParsedStdoutLine | undefined {
  if (
    event.type === "tool_execution_start" &&
    typeof event.toolName === "string"
  ) {
    return {
      emit: { stdoutLine: summarizeToolStart(event.toolName, event.args) },
    };
  }

  if (
    event.type === "tool_execution_end" &&
    typeof event.toolName === "string" &&
    event.isError
  ) {
    return { emit: { stdoutLine: `${event.toolName} failed` } };
  }

  return undefined;
}
