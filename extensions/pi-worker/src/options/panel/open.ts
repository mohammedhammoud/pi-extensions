import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Key, matchesKey } from "@earendil-works/pi-tui";
import type { ActiveModel } from "../../core/session";
import {
  cycleWorkerMode,
  getWorkerModeColor,
  requiresWorkerPlan,
  showsWorkerPlan,
  type WorkerMode,
} from "../../core/mode/definition";
import { WORKER_MESSAGES, WORKER_PANEL_COPY } from "../../ui/copy";
import {
  getSelectableModels,
  pickInitialModel,
  selectWorkerModel,
  type ModelInfo,
} from "../model/select";
import { selectWorkerPlan } from "../plan/picker";
import {
  createWorkerSettingRows,
  type WorkerSettingsAction,
  type WorkerSettingsViewState,
  renderSettingsLine,
  truncateRowValue,
} from "./rows";
import { cycleWorkerTimeout } from "../timeout/timeout";
import type { WorkerRequestDraft } from "../../worker/request";
import type { WorkerPlan } from "../../artifacts/plans/store";
import { getWorkerPlanDisplayName } from "../../artifacts/plans/labels";

const MAX_PANEL_ITERATIONS = 100;
const ERROR_LEVEL = "error";

interface WorkerPanelState {
  model: ModelInfo;
  mode: WorkerMode;
  timeoutMs: number;
  selectedPlan: WorkerPlan | undefined;
}

export async function openWorkerPanel(
  ctx: ExtensionContext,
  currentModel: ActiveModel | undefined,
  currentMode: WorkerMode,
  currentTimeoutMs: number,
  onModeChange?: (mode: WorkerMode) => void,
  onTimeoutChange?: (timeoutMs: number) => void,
): Promise<WorkerRequestDraft | undefined> {
  const models = getSelectableModels(ctx, currentModel);
  if (models.length === 0) {
    ctx.ui.notify(WORKER_MESSAGES.noModels, ERROR_LEVEL);
    return undefined;
  }

  const state: WorkerPanelState = {
    model: pickInitialModel(models, currentModel),
    mode: currentMode,
    timeoutMs: currentTimeoutMs,
    selectedPlan: undefined,
  };

  let iterations = 0;
  while (iterations++ < MAX_PANEL_ITERATIONS) {
    const action = await openWorkerSettings(
      ctx,
      toViewState(state),
      (nextMode) => {
        state.mode = nextMode;
        if (!showsWorkerPlan(nextMode)) {
          state.selectedPlan = undefined;
        }
        onModeChange?.(nextMode);
      },
      (nextTimeoutMs) => {
        state.timeoutMs = nextTimeoutMs;
        onTimeoutChange?.(nextTimeoutMs);
      },
    );

    if (!action) return undefined;

    if (action === "model") {
      const nextModel = await selectWorkerModel(ctx, models, state.model);
      if (nextModel) state.model = nextModel;
      continue;
    }

    if (action === "plan") {
      const plan = await selectWorkerPlan(ctx);
      if (plan === undefined) continue;
      state.selectedPlan = plan ?? undefined;
      continue;
    }

    if (requiresWorkerPlan(state.mode) && !state.selectedPlan) {
      ctx.ui.notify(WORKER_MESSAGES.planRequired, ERROR_LEVEL);
      continue;
    }

    const prompt = await ctx.ui.editor(`worker · ${state.mode}`);
    if (prompt === undefined) return undefined;

    return {
      model: state.model,
      mode: state.mode,
      prompt,
      timeoutMs: state.timeoutMs,
      ...(state.selectedPlan ? { selectedPlan: state.selectedPlan } : {}),
    };
  }

  return undefined;
}

function openWorkerSettings(
  ctx: ExtensionContext,
  initialState: WorkerSettingsViewState,
  setMode: (mode: WorkerMode) => void,
  setTimeoutMs: (timeoutMs: number) => void,
): Promise<WorkerSettingsAction | undefined> {
  return ctx.ui.custom<WorkerSettingsAction | undefined>(
    (tui, theme, _kb, done) => {
      let selectedIndex = 0;
      let viewState = initialState;
      let rows = createWorkerSettingRows(viewState);

      const rebuildRows = (): void => {
        rows = createWorkerSettingRows(viewState);
        if (selectedIndex >= rows.length) {
          selectedIndex = rows.length - 1;
        }
      };

      return {
        render: (width: number): string[] => [
          theme.fg(getWorkerModeColor(viewState.mode), theme.bold("⚙ worker")),
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
          theme.fg("dim", WORKER_PANEL_COPY.hint),
        ],
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
            viewState = { ...viewState, mode: cycleWorkerMode(viewState.mode) };
            setMode(viewState.mode);
            rebuildRows();
            tui.requestRender();
            return;
          }

          if (selectedRow.action === "timeout") {
            viewState = {
              ...viewState,
              timeoutMs: cycleWorkerTimeout(viewState.timeoutMs),
            };
            setTimeoutMs(viewState.timeoutMs);
            rebuildRows();
            tui.requestRender();
            return;
          }

          done(selectedRow.action);
        },
      };
    },
  );
}

function toViewState(state: WorkerPanelState): WorkerSettingsViewState {
  return {
    modelLabel: state.model.label,
    mode: state.mode,
    timeoutMs: state.timeoutMs,
    planLabel: state.selectedPlan
      ? getWorkerPlanDisplayName(state.selectedPlan)
      : WORKER_PANEL_COPY.noPlan,
  };
}
