import { readFile } from "node:fs/promises";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import {
  Key,
  matchesKey,
  truncateToWidth,
  wrapTextWithAnsi,
} from "@earendil-works/pi-tui";
import type { WorkerPlan } from "../../artifacts/plans/store";
import { getWorkerPlanDisplayName } from "../../artifacts/plans/labels";
import { PLAN_PREVIEW_HINT, WORKER_MESSAGES } from "../../ui/copy";

const EMPTY_PLAN_TEXT = "(empty plan)";
const PREVIEW_HEIGHT = 16;
const ERROR_LEVEL = "error";

export async function previewWorkerPlan(
  ctx: ExtensionContext,
  plan: WorkerPlan,
): Promise<void> {
  if (!plan.available) {
    ctx.ui.notify(WORKER_MESSAGES.planUnavailable, ERROR_LEVEL);
    return;
  }

  let content: string;
  try {
    content = (await readFile(plan.path, "utf8")).trimEnd() || EMPTY_PLAN_TEXT;
  } catch {
    ctx.ui.notify(WORKER_MESSAGES.planUnavailable, ERROR_LEVEL);
    return;
  }

  await ctx.ui.custom<void>((tui, theme, _kb, done) => {
    let scrollOffset = 0;
    let wrappedLines: string[] = [];

    const ensureWrappedLines = (width: number): string[] => {
      const bodyWidth = Math.max(20, width - 1);
      wrappedLines = content
        .split("\n")
        .flatMap((line) => wrapTextWithAnsi(line || " ", bodyWidth));
      return wrappedLines;
    };

    const clampOffset = (lines: string[]): void => {
      const maxOffset = Math.max(0, lines.length - PREVIEW_HEIGHT);
      if (scrollOffset > maxOffset) scrollOffset = maxOffset;
      if (scrollOffset < 0) scrollOffset = 0;
    };

    return {
      render: (width: number) => {
        const lines = ensureWrappedLines(width);
        clampOffset(lines);
        const visible = lines
          .slice(scrollOffset, scrollOffset + PREVIEW_HEIGHT)
          .map((line) => truncateToWidth(line, width));
        const footer = `${scrollOffset + 1}-${Math.min(scrollOffset + visible.length, lines.length)}/${lines.length}`;

        return [
          theme.fg(
            "accent",
            theme.bold(`plan preview · ${getWorkerPlanDisplayName(plan)}`),
          ),
          ...visible,
          theme.fg("dim", `${PLAN_PREVIEW_HINT} · ${footer}`),
        ];
      },
      invalidate: () => undefined,
      handleInput: (data: string) => {
        if (matchesKey(data, Key.escape) || matchesKey(data, Key.enter)) {
          done(undefined);
          return;
        }

        if (matchesKey(data, Key.up)) scrollOffset -= 1;
        if (matchesKey(data, Key.down)) scrollOffset += 1;
        if (matchesKey(data, Key.pageUp)) scrollOffset -= PREVIEW_HEIGHT;
        if (matchesKey(data, Key.pageDown)) scrollOffset += PREVIEW_HEIGHT;
        if (matchesKey(data, Key.home)) scrollOffset = 0;
        if (matchesKey(data, Key.end))
          scrollOffset = wrappedLines.length - PREVIEW_HEIGHT;

        clampOffset(wrappedLines);
        tui.requestRender();
      },
    };
  });
}
