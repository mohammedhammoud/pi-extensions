import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { Plan } from "../core/store";

export async function openPlanEditor(
  ctx: ExtensionContext,
  plan: Plan,
): Promise<string | undefined> {
  return ctx.ui.editor(`Edit plan: ${plan.title}`, plan.body);
}
