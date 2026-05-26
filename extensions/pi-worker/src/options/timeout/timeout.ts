const MINUTE_MS = 60_000;

const WORKER_TIMEOUT_OPTIONS = [
  { label: "2m", value: 2 * MINUTE_MS },
  { label: "5m", value: 5 * MINUTE_MS },
  { label: "10m", value: 10 * MINUTE_MS },
  { label: "off", value: 0 },
] as const;

const WORKER_TIMEOUT_VALUES = WORKER_TIMEOUT_OPTIONS.map(
  (option) => option.value,
);
const WORKER_TIMEOUT_LABELS = WORKER_TIMEOUT_OPTIONS.map(
  (option) => option.label,
);

export function cycleWorkerTimeout(current: number): number {
  const index = WORKER_TIMEOUT_VALUES.findIndex((value) => value === current);
  return (
    WORKER_TIMEOUT_VALUES[(index + 1) % WORKER_TIMEOUT_VALUES.length] ?? current
  );
}

export function formatTimeout(timeoutMs: number): string {
  return (
    WORKER_TIMEOUT_OPTIONS.find((option) => option.value === timeoutMs)
      ?.label ?? "off"
  );
}

export function parseTimeoutLabel(label: string): number {
  const index = WORKER_TIMEOUT_LABELS.indexOf(
    label as (typeof WORKER_TIMEOUT_LABELS)[number],
  );
  return index >= 0 ? (WORKER_TIMEOUT_VALUES[index] ?? 0) : 0;
}
