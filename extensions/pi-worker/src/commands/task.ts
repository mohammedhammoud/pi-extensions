import type { WorkerMode } from "../core/state";

const MODE_PREFIXES: Record<WorkerMode, string | undefined> = {
  plan: "Mode: plan. Produce a concrete plan only. Do not implement changes.",
  implement:
    "Mode: implement. Do the implementation work and return the concrete result.",
  review:
    "Mode: review. Review the target carefully and report findings clearly.",
  task: undefined,
};

export function buildWorkerTask(
  mode: WorkerMode,
  prompt: string | undefined,
): string | undefined {
  const trimmed = prompt?.trim();
  if (!trimmed) return undefined;

  const prefix = MODE_PREFIXES[mode];
  return prefix ? `${prefix}\n\n${trimmed}` : trimmed;
}
