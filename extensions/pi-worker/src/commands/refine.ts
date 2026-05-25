import type { ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import {
  buildReuseOutputPrompt,
  resolveWorkerOutputPath,
} from "../core/output";
import type { WorkerCommandAction } from "./task";

export const OUTPUT_NOT_FOUND_MESSAGE = "Worker output not found";
export const REFINE_USAGE_MESSAGE = "Usage: /worker refine <path>";

export function getWorkerRefineError(
  parsed: WorkerCommandAction,
  promptPrefill: string | undefined,
): string | undefined {
  if (parsed.action !== "refine" || promptPrefill !== undefined)
    return undefined;
  return parsed.path ? OUTPUT_NOT_FOUND_MESSAGE : REFINE_USAGE_MESSAGE;
}

export async function buildWorkerPromptPrefill(
  parsed: WorkerCommandAction,
  ctx: ExtensionCommandContext,
): Promise<string | undefined> {
  if (parsed.action !== "refine") return undefined;
  if (!parsed.path) return undefined;

  const output = await resolveWorkerOutputPath(ctx.cwd, parsed.path);
  if (!output) return undefined;

  return buildReuseOutputPrompt(output);
}
