import { getSettingsListTheme } from "@earendil-works/pi-coding-agent";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Container, SettingsList, Text } from "@earendil-works/pi-tui";
import { formatModelKey, type ActiveModel } from "../core/model.js";
import type { ExtensionState } from "../core/state.js";
import { SETTING_LIST_HEIGHT } from "../options/defaults.js";
import { renderStatus } from "../options/status.js";
import { applyOptionChange } from "../options/update.js";
import type { OptionId } from "../options/types.js";
import { buildSettingItems, refreshSettingItems } from "./settings-items.js";

export async function openOptionsPanel(
  state: ExtensionState,
  ctx: ExtensionContext,
  model: ActiveModel,
): Promise<void> {
  await ctx.ui.custom<void>((tui, theme, _kb, done) => {
    const container = new Container();
    container.addChild(
      new Text(
        theme.fg(
          "accent",
          theme.bold(`Model options: ${formatModelKey(model)}`),
        ),
      ),
    );

    const settingsList = new SettingsList(
      buildSettingItems(state, model, theme),
      SETTING_LIST_HEIGHT,
      getSettingsListTheme(),
      (id: string, value: string) => {
        const next = applyOptionChange(
          state,
          ctx,
          model,
          id as OptionId,
          value,
        );
        renderStatus(state, ctx);
        refreshSettingItems(settingsList, next);
        tui.requestRender();
      },
      () => done(undefined),
    );

    container.addChild(settingsList);

    return {
      render: (width: number) => container.render(width),
      invalidate: () => container.invalidate(),
      handleInput: (data: string) => {
        settingsList.handleInput?.(data);
        tui.requestRender();
      },
    };
  });
}
