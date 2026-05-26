export const WORKER_MODES = [
  "task",
  "plan",
  "refine",
  "implement",
  "review",
] as const;

export type WorkerMode = (typeof WORKER_MODES)[number];

export interface WorkerModeMeta {
  color: "accent" | "warning" | "success" | "error" | "muted";
  requiresPlan: boolean;
  showsPlan: boolean;
  directives: string[];
}

export const WORKER_MODE_META: Record<WorkerMode, WorkerModeMeta> = {
  task: {
    color: "muted",
    requiresPlan: false,
    showsPlan: false,
    directives: ["Mode: task.", "Do the requested work directly."],
  },
  plan: {
    color: "warning",
    requiresPlan: false,
    showsPlan: false,
    directives: [
      "Mode: plan.",
      "Produce a concrete plan only.",
      "Do not implement changes.",
      "Return ordered steps with files, checks, and risks when relevant.",
    ],
  },
  refine: {
    color: "accent",
    requiresPlan: true,
    showsPlan: true,
    directives: [
      "Mode: refine.",
      "Update the selected plan and return the full revised plan only.",
      "Preserve useful parts. Replace weak or stale parts.",
    ],
  },
  implement: {
    color: "success",
    requiresPlan: true,
    showsPlan: true,
    directives: [
      "Mode: implement.",
      "Implement the selected plan.",
      "Keep changes minimal and aligned with existing code style.",
    ],
  },
  review: {
    color: "error",
    requiresPlan: false,
    showsPlan: true,
    directives: [
      "Mode: review.",
      "Review the target carefully and report findings clearly.",
      "Lead with findings. Cite concrete files or outputs.",
    ],
  },
};

export function cycleWorkerMode(current: WorkerMode): WorkerMode {
  const index = WORKER_MODES.findIndex((mode) => mode === current);
  return WORKER_MODES[(index + 1) % WORKER_MODES.length] ?? current;
}

export function isWorkerMode(value: unknown): value is WorkerMode {
  return (
    typeof value === "string" && WORKER_MODES.includes(value as WorkerMode)
  );
}

export function getWorkerModeDirectives(mode: WorkerMode): string[] {
  return WORKER_MODE_META[mode].directives;
}

export function getWorkerModeColor(mode: WorkerMode): WorkerModeMeta["color"] {
  return WORKER_MODE_META[mode].color;
}

export function requiresWorkerPlan(mode: WorkerMode): boolean {
  return WORKER_MODE_META[mode].requiresPlan;
}

export function showsWorkerPlan(mode: WorkerMode): boolean {
  return WORKER_MODE_META[mode].showsPlan;
}
