import type { ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import type { ExtensionState } from "../core/state";
import { getModelKey } from "../core/state";
import { formatWorkerWidget } from "./report";

const WORKER_KEY = "pi-worker";
const WIDGET_PLACEMENT = "aboveEditor";
const WIDGET_INTERVAL_MS = 250;

export function startWorkerWidget(
  ctx: ExtensionCommandContext,
  state: ExtensionState,
): () => void {
  let lastWidgetText = renderWorkerUi(ctx, state);

  const intervalId = setInterval(() => {
    if (!state.worker) {
      lastWidgetText = renderWorkerUi(ctx, state);
      return;
    }

    const nextWidgetText = formatWorkerWidget(state.worker).join("\n");
    if (nextWidgetText === lastWidgetText) return;
    lastWidgetText = renderWorkerUi(ctx, state);
  }, WIDGET_INTERVAL_MS);

  return () => {
    clearInterval(intervalId);
    clearWorkerUi(ctx);
  };
}

export function renderWorkerUi(
  ctx: ExtensionCommandContext,
  state: ExtensionState,
): string {
  if (!state.worker) {
    clearWorkerUi(ctx);
    return "";
  }

  const widgetLines = formatWorkerWidget(state.worker);
  const widgetText = widgetLines.join("\n");

  ctx.ui.setStatus(WORKER_KEY, getModelKey(state.worker.model));
  ctx.ui.setWidget(WORKER_KEY, widgetLines, {
    placement: WIDGET_PLACEMENT,
  });

  return widgetText;
}

export function clearWorkerUi(ctx: {
  ui: ExtensionCommandContext["ui"];
}): void {
  ctx.ui.setStatus(WORKER_KEY, undefined);
  ctx.ui.setWidget(WORKER_KEY, undefined);
}
