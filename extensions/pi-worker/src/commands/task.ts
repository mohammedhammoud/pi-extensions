import type { WorkerMode } from "../core/state";

const RUN_ACTION = "run";
const OUTPUTS_ACTION = "outputs";
const REFINE_ACTION = "refine";
const REFINE_PREFIX = `${REFINE_ACTION} `;

const MODE_PREFIXES: Record<WorkerMode, string | undefined> = {
  plan: "Mode: plan. Produce a concrete plan only. Do not implement changes.",
  implement:
    "Mode: implement. Do the implementation work and return the concrete result.",
  review:
    "Mode: review. Review the target carefully and report findings clearly.",
  task: undefined,
};

export type WorkerCommandAction =
  | { action: "run" }
  | { action: "outputs" }
  | { action: "refine"; path?: string };

export function buildWorkerTask(
  mode: WorkerMode,
  prompt: string | undefined,
): string | undefined {
  const trimmed = prompt?.trim();
  if (!trimmed) return undefined;

  const prefix = MODE_PREFIXES[mode];
  return prefix ? `${prefix}\n\n${trimmed}` : trimmed;
}

export function parseCommandArgs(args: string): WorkerCommandAction {
  const trimmed = args.trim();
  if (!trimmed) return { action: RUN_ACTION };
  if (trimmed === OUTPUTS_ACTION) return { action: OUTPUTS_ACTION };
  if (trimmed === REFINE_ACTION) return { action: REFINE_ACTION };
  return parseRefineArgs(trimmed) ?? { action: RUN_ACTION };
}

function parseRefineArgs(args: string): WorkerCommandAction | undefined {
  if (!args.startsWith(REFINE_PREFIX)) return undefined;
  return {
    action: REFINE_ACTION,
    path: args.slice(REFINE_PREFIX.length).trim(),
  };
}
