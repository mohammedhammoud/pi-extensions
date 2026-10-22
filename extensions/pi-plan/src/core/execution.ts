import type { ExtensionUIContext } from "@earendil-works/pi-coding-agent";
import type { Plan } from "./store";

export async function loadPlanForExecution(
  ui: Pick<
    ExtensionUIContext,
    "getEditorText" | "setEditorText" | "confirm" | "notify"
  >,
  plan: Plan,
  signal: AbortSignal,
): Promise<void> {
  if (signal.aborted) return;
  if (
    ui.getEditorText().trim() &&
    !(await ui.confirm(
      "Replace editor draft?",
      "Loading this plan will replace the text currently in Pi's editor. Nothing will execute until you submit it.",
    ))
  )
    return;
  if (signal.aborted) return;
  ui.setEditorText(
    [
      "Implement the following plan for the current project.",
      "Inspect the relevant code and follow project instructions before making changes. Verify assumptions, flag blockers, and run appropriate checks. Do not mark the plan done automatically.",
      `Plan document: ${plan.path}`,
      plan.body,
    ].join("\n\n"),
  );
  ui.notify(
    "Plan loaded into the editor. Review and submit to begin implementation.",
    "info",
  );
}
