import type { ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";
import { Key, matchesKey, truncateToWidth } from "@earendil-works/pi-tui";
import {
  buildReuseOutputPrompt,
  formatWorkerOutputLabel,
  type WorkerOutput,
} from "../../core/output";
import type { ActiveModel, WorkerMode } from "../../core/state";
import { hasSavedWorkerOutputs, selectWorkerInputOutput } from "./input-picker";
import {
  getSelectableModels,
  pickInitialModel,
  selectWorkerModel,
  type ModelInfo,
} from "./models";
import {
  cycleWorkerMode,
  cycleWorkerTimeout,
  formatTimeout,
  type WorkerTimeoutMs,
} from "./timeout";

const MAX_PANEL_ITERATIONS = 100;
const NO_MODELS_MESSAGE = "No models available";
const MODEL_LABEL = "Model";
const MODE_LABEL = "Mode";
const TIMEOUT_LABEL = "Timeout";
const INPUT_LABEL = "Input";
const CONTINUE_LABEL = "Continue";
const PANEL_HINT = "↑↓ select • Enter change/continue • Esc cancel";
const MIN_MODEL_WIDTH = 10;
const MODEL_VALUE_PADDING = 12;
const SETTING_LABEL_WIDTH = 8;
const BLANK_INPUT_LABEL = "blank";
const ERROR_LEVEL = "error";

type WorkerSettingsAction = "model" | "mode" | "timeout" | "input" | "continue";
type WorkerInputSource = "new-task" | "refine-output";

interface WorkerSettingRow {
  action: WorkerSettingsAction;
  label: string;
  value: string;
  idleTone?: "accent" | "warning" | "success" | "error" | "muted" | "text";
  selectedTone?: "accent" | "warning" | "success" | "error" | "muted" | "text";
}

export interface WorkerPanelResult {
  model: ModelInfo;
  mode: WorkerMode;
  prompt: string;
  timeoutMs: WorkerTimeoutMs;
  sourceType: WorkerInputSource;
  selectedOutput?: WorkerOutput;
}

export async function openWorkerPanel(
  ctx: ExtensionContext,
  currentModel: ActiveModel | undefined,
  currentMode: WorkerMode,
  promptPrefill = "",
  currentTimeoutMs: WorkerTimeoutMs,
  onModeChange?: (mode: WorkerMode) => void,
  onTimeoutChange?: (timeoutMs: WorkerTimeoutMs) => void,
): Promise<WorkerPanelResult | undefined> {
  const models = getSelectableModels(ctx, currentModel);
  if (models.length === 0) {
    ctx.ui.notify(NO_MODELS_MESSAGE, ERROR_LEVEL);
    return undefined;
  }

  const showInput =
    promptPrefill.length > 0 || (await hasSavedWorkerOutputs(ctx));
  let model = pickInitialModel(models, currentModel);
  let mode: WorkerMode = currentMode;
  let timeoutMs: WorkerTimeoutMs = currentTimeoutMs;
  let selectedOutput: WorkerOutput | undefined;
  let inputSource: WorkerInputSource = promptPrefill
    ? "refine-output"
    : "new-task";
  let inputLabel = promptPrefill ? "Previous output" : BLANK_INPUT_LABEL;
  let nextPromptPrefill = promptPrefill;
  let iterations = 0;

  while (iterations++ < MAX_PANEL_ITERATIONS) {
    const action = await openWorkerSettings(
      ctx,
      createWorkerSettingRows(model, mode, timeoutMs, inputLabel, showInput),
      (nextMode) => {
        mode = nextMode;
        onModeChange?.(nextMode);
      },
      (nextTimeoutMs) => {
        timeoutMs = nextTimeoutMs;
        onTimeoutChange?.(nextTimeoutMs);
      },
    );

    if (!action) return undefined;

    if (action === "model") {
      const nextModel = await selectWorkerModel(ctx, models, model);
      if (nextModel) model = nextModel;
      continue;
    }

    if (action === "input") {
      const output = await selectWorkerInputOutput(ctx);
      if (output === undefined) continue;
      if (output === null) {
        selectedOutput = undefined;
        inputSource = "new-task";
        inputLabel = BLANK_INPUT_LABEL;
        nextPromptPrefill = "";
        continue;
      }

      selectedOutput = output;
      inputSource = "refine-output";
      inputLabel = formatWorkerOutputLabel(output);
      nextPromptPrefill = buildReuseOutputPrompt(output);
      continue;
    }

    const prompt = await ctx.ui.editor(`worker · ${mode}`, nextPromptPrefill);
    if (prompt === undefined) return undefined;

    return {
      model,
      mode,
      prompt,
      timeoutMs,
      sourceType: inputSource,
      ...(selectedOutput ? { selectedOutput } : {}),
    };
  }

  return undefined;
}

function openWorkerSettings(
  ctx: ExtensionContext,
  rows: WorkerSettingRow[],
  setMode: (mode: WorkerMode) => void,
  setTimeoutMs: (timeoutMs: WorkerTimeoutMs) => void,
): Promise<WorkerSettingsAction | undefined> {
  return ctx.ui.custom<WorkerSettingsAction | undefined>(
    (tui, theme, _kb, done) => {
      let selectedIndex = 0;
      let currentMode = getModeFromRows(rows);
      let currentTimeoutMs = getTimeoutFromRows(rows);

      const render = (width: number): string[] => {
        const color = getModeColor(currentMode);
        return [
          theme.fg(color, theme.bold(`worker · ${currentMode}`)),
          ...rows.map((row, index) =>
            renderSettingsLine(
              theme,
              row.label,
              truncateRowValue(row, width),
              selectedIndex === index,
              row.idleTone,
              row.selectedTone,
            ),
          ),
          theme.fg("dim", PANEL_HINT),
        ];
      };

      return {
        render,
        invalidate: () => undefined,
        handleInput: (data: string) => {
          if (matchesKey(data, Key.escape)) {
            done(undefined);
            return;
          }

          if (matchesKey(data, Key.up)) {
            selectedIndex =
              selectedIndex === 0 ? rows.length - 1 : selectedIndex - 1;
            tui.requestRender();
            return;
          }

          if (matchesKey(data, Key.down)) {
            selectedIndex =
              selectedIndex === rows.length - 1 ? 0 : selectedIndex + 1;
            tui.requestRender();
            return;
          }

          if (!matchesKey(data, Key.enter) && !matchesKey(data, Key.space)) {
            return;
          }

          const selectedRow = rows[selectedIndex];
          if (!selectedRow) return;

          if (selectedRow.action === "mode") {
            currentMode = cycleWorkerMode(currentMode);
            setMode(currentMode);
            const modeRow = rows.find((r) => r.action === "mode");
            if (modeRow) modeRow.value = currentMode;
            tui.requestRender();
            return;
          }

          if (selectedRow.action === "timeout") {
            currentTimeoutMs = cycleWorkerTimeout(currentTimeoutMs);
            setTimeoutMs(currentTimeoutMs);
            const timeoutRow = rows.find((r) => r.action === "timeout");
            if (timeoutRow) timeoutRow.value = formatTimeout(currentTimeoutMs);
            tui.requestRender();
            return;
          }

          done(selectedRow.action);
        },
      };
    },
  );
}

function createWorkerSettingRows(
  model: ModelInfo,
  mode: WorkerMode,
  timeoutMs: WorkerTimeoutMs,
  inputLabel: string,
  showInput: boolean,
): WorkerSettingRow[] {
  return [
    {
      action: "model",
      label: MODEL_LABEL,
      value: model.label,
    },
    {
      action: "mode",
      label: MODE_LABEL,
      value: mode,
    },
    {
      action: "timeout",
      label: TIMEOUT_LABEL,
      value: formatTimeout(timeoutMs),
    },
    ...(showInput
      ? [
          {
            action: "input",
            label: INPUT_LABEL,
            value: inputLabel,
          } satisfies WorkerSettingRow,
        ]
      : []),
    {
      action: "continue",
      label: CONTINUE_LABEL,
      value: "",
      idleTone: "warning",
      selectedTone: "success",
    },
  ];
}

function getModeFromRows(rows: WorkerSettingRow[]): WorkerMode {
  return (
    (rows.find((row) => row.action === "mode")?.value as
      | WorkerMode
      | undefined) ?? "task"
  );
}

function getTimeoutFromRows(rows: WorkerSettingRow[]): WorkerTimeoutMs {
  const value = rows.find((row) => row.action === "timeout")?.value;
  if (value === "2m") return 2 * 60_000;
  if (value === "5m") return 5 * 60_000;
  if (value === "10m") return 10 * 60_000;
  return 0;
}

function truncateRowValue(row: WorkerSettingRow, width: number): string {
  if (!row.value) return row.value;
  return truncateToWidth(
    row.value,
    Math.max(MIN_MODEL_WIDTH, width - MODEL_VALUE_PADDING),
  );
}

function getModeColor(
  mode: WorkerMode,
): "accent" | "warning" | "success" | "error" | "muted" {
  const colors: Record<
    WorkerMode,
    "accent" | "warning" | "success" | "error" | "muted"
  > = {
    task: "muted",
    plan: "warning",
    implement: "success",
    review: "error",
  };
  return colors[mode];
}

function renderSettingsLine(
  theme: Theme,
  label: string,
  value: string,
  selected: boolean,
  idleTone:
    | "accent"
    | "warning"
    | "success"
    | "error"
    | "muted"
    | "text" = "text",
  selectedTone:
    | "accent"
    | "warning"
    | "success"
    | "error"
    | "muted"
    | "text" = "accent",
): string {
  const prefix = selected ? "→ " : "  ";
  const labelText = `${prefix}${label.padEnd(SETTING_LABEL_WIDTH, " ")}`;
  const labelTone = selected ? selectedTone : idleTone;
  const valueTone = selected ? selectedTone : idleTone;
  return `${theme.fg(labelTone, labelText)} ${theme.fg(valueTone, value)}`;
}

export type { WorkerTimeoutMs } from "./timeout";
