import type { Theme } from "@earendil-works/pi-coding-agent";
import { truncateToWidth } from "@earendil-works/pi-tui";
import { showsWorkerPlan, type WorkerMode } from "../../core/mode/definition";
import { formatTimeout } from "../timeout/timeout";
import { WORKER_PANEL_COPY } from "../../ui/copy";

const MIN_MODEL_WIDTH = 10;
const MODEL_VALUE_PADDING = 12;
const SETTING_LABEL_WIDTH = 8;

export type WorkerSettingsAction =
  | "model"
  | "mode"
  | "timeout"
  | "plan"
  | "continue";

export interface WorkerSettingRow {
  action: WorkerSettingsAction;
  label: string;
  value: string;
  idleTone?: "accent" | "warning" | "success" | "error" | "muted" | "text";
  selectedTone?: "accent" | "warning" | "success" | "error" | "muted" | "text";
}

export interface WorkerSettingsViewState {
  modelLabel: string;
  mode: WorkerMode;
  timeoutMs: number;
  planLabel: string;
}

export function createWorkerSettingRows(
  state: WorkerSettingsViewState,
): WorkerSettingRow[] {
  return [
    {
      action: "model",
      label: WORKER_PANEL_COPY.model,
      value: state.modelLabel,
    },
    {
      action: "mode",
      label: WORKER_PANEL_COPY.mode,
      value: state.mode,
    },
    {
      action: "timeout",
      label: WORKER_PANEL_COPY.timeout,
      value: formatTimeout(state.timeoutMs),
    },
    ...(showsWorkerPlan(state.mode)
      ? [
          {
            action: "plan",
            label: WORKER_PANEL_COPY.plan,
            value: state.planLabel,
          } satisfies WorkerSettingRow,
        ]
      : []),
    {
      action: "continue",
      label: WORKER_PANEL_COPY.continue,
      value: "",
      idleTone: "muted",
      selectedTone: "warning",
    },
  ];
}

type Tone = "accent" | "warning" | "success" | "error" | "muted" | "text";

export function renderSettingsLine(
  theme: Theme,
  label: string,
  value: string,
  selected: boolean,
  idleTone: Tone = "text",
  selectedTone: Tone = "accent",
): string {
  const prefix = selected ? "→ " : "  ";
  const labelText = `${prefix}${label.padEnd(SETTING_LABEL_WIDTH, " ")}`;
  const labelTone = selected ? selectedTone : idleTone;
  const valueTone = selected ? selectedTone : idleTone;
  return `${theme.fg(labelTone, labelText)} ${theme.fg(valueTone, value)}`;
}

export function truncateRowValue(row: WorkerSettingRow, width: number): string {
  if (!row.value) return row.value;
  return truncateToWidth(
    row.value,
    Math.max(MIN_MODEL_WIDTH, width - MODEL_VALUE_PADDING),
  );
}
