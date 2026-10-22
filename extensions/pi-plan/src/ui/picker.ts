import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Key, matchesKey, SelectList, Text } from "@earendil-works/pi-tui";
import type { Plan, PlanStatus } from "../core/store";

export type PlanAction = { action: "open" | "toggle" | "delete"; plan: Plan };

export async function selectStatus(
  ctx: ExtensionContext,
): Promise<PlanStatus | undefined> {
  const selected = await ctx.ui.select("Plans — choose status", [
    "Active",
    "Done",
  ]);
  return selected === "Active"
    ? "active"
    : selected === "Done"
      ? "done"
      : undefined;
}

export async function pickPlan(
  ctx: ExtensionContext,
  plans: Plan[],
  status: PlanStatus,
  browsing = false,
  selectedId?: string,
): Promise<PlanAction | undefined> {
  return ctx.ui.custom<PlanAction | undefined>((tui, theme, _kb, done) => {
    const list = new SelectList(
      plans.map((plan) => ({
        value: plan.id,
        label: plan.title.replace(/\p{Cc}/gu, " "),
        description: plan.updatedAt.slice(0, 10),
      })),
      12,
      {
        selectedPrefix: (text) => theme.fg("accent", text),
        selectedText: (text) => theme.fg("accent", text),
        description: (text) => theme.fg("muted", text),
        scrollInfo: (text) => theme.fg("dim", text),
        noMatch: (text) => theme.fg("warning", text),
      },
    );
    const selectedIndex = plans.findIndex((plan) => plan.id === selectedId);
    if (selectedIndex >= 0) list.setSelectedIndex(selectedIndex);
    const choose = (action: PlanAction["action"]): void => {
      const plan = plans.find(
        (plan) => plan.id === list.getSelectedItem()?.value,
      );
      if (plan) done({ action, plan });
    };
    list.onSelect = () => choose("open");
    list.onCancel = () => done(undefined);
    const heading = new Text(
      theme.fg("accent", `Plans — ${status === "active" ? "Active" : "Done"}`),
      0,
      0,
    );
    const hint = new Text(
      theme.fg(
        "dim",
        browsing
          ? "↑↓ select · Enter editor · Tab toggle status · X trash · Esc back"
          : "↑↓ select · Enter choose · Esc back",
      ),
      0,
      0,
    );
    return {
      render: (width) => [
        ...heading.render(width),
        ...list.render(width),
        ...hint.render(width),
      ],
      invalidate: () => {
        heading.invalidate();
        list.invalidate();
        hint.invalidate();
      },
      handleInput: (data) => {
        if (browsing && matchesKey(data, Key.tab)) choose("toggle");
        else if (browsing && (data === "x" || data === "X")) choose("delete");
        else list.handleInput(data);
        tui.requestRender();
      },
    };
  });
}
