import {
  getMarkdownTheme,
  type ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import {
  Key,
  Markdown,
  matchesKey,
  truncateToWidth,
} from "@earendil-works/pi-tui";
import type { Plan } from "../core/store";

export async function previewPlan(
  ctx: ExtensionContext,
  plan: Plan,
): Promise<void> {
  await ctx.ui.custom<void>((tui, theme, _kb, done) => {
    const markdown = new Markdown(plan.body, 0, 0, getMarkdownTheme());
    let offset = 0;
    let length = 0;
    const height = 16;
    return {
      render: (width) => {
        const lines = markdown.render(width);
        length = lines.length;
        offset = Math.max(0, Math.min(offset, length - height));
        return [
          truncateToWidth(
            theme.fg("accent", `${plan.title} — ${plan.status}`),
            width,
          ),
          ...lines.slice(offset, offset + height),
          truncateToWidth(
            theme.fg("dim", "↑↓ scroll · PgUp/PgDn · Esc close"),
            width,
          ),
        ];
      },
      invalidate: () => markdown.invalidate(),
      handleInput: (data) => {
        if (matchesKey(data, Key.escape) || matchesKey(data, Key.enter)) {
          done();
          return;
        }
        if (matchesKey(data, Key.up)) offset--;
        if (matchesKey(data, Key.down)) offset++;
        if (matchesKey(data, Key.pageUp)) offset -= height;
        if (matchesKey(data, Key.pageDown)) offset += height;
        if (matchesKey(data, Key.home)) offset = 0;
        if (matchesKey(data, Key.end)) offset = length - height;
        tui.requestRender();
      },
    };
  });
}
