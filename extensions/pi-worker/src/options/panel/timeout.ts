import type { WorkerMode } from "../../core/state";

export type WorkerTimeoutMs = number;

const MINUTE_MS = 60_000;
const MODE_ORDER: WorkerMode[] = ["task", "plan", "implement", "review"];

const WORKER_TIMEOUT_OPTIONS = [
  { label: "2m", value: 2 * MINUTE_MS },
  { label: "5m", value: 5 * MINUTE_MS },
  { label: "10m", value: 10 * MINUTE_MS },
  { label: "off", value: 0 },
] as const;

const WORKER_TIMEOUT_VALUES = WORKER_TIMEOUT_OPTIONS.map(
  (option) => option.value,
);

function cycleOption<T>(options: readonly T[], current: T): T {
  const index = options.findIndex((option) => option === current);
  return options[(index + 1) % options.length] ?? current;
}

export function formatTimeout(timeoutMs: WorkerTimeoutMs): string {
  return (
    WORKER_TIMEOUT_OPTIONS.find((option) => option.value === timeoutMs)
      ?.label ?? "off"
  );
}

export function cycleWorkerMode(current: WorkerMode): WorkerMode {
  return cycleOption(MODE_ORDER, current);
}

export function cycleWorkerTimeout(current: WorkerTimeoutMs): WorkerTimeoutMs {
  return cycleOption(WORKER_TIMEOUT_VALUES, current);
}
