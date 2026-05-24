import {
  getSettingsListTheme,
  type ExtensionContext,
  type Theme,
} from "@earendil-works/pi-coding-agent";
import {
  Container,
  SettingsList,
  Text,
  type SettingItem,
} from "@earendil-works/pi-tui";
import { LIST_HEIGHT } from "./constants";

export interface SettingsPanelControls {
  updateValue(id: string, value: string): void;
  requestRender(): void;
}

export interface SettingsPanelConfig {
  title: string;
  buildItems(theme: Theme): SettingItem[];
  onChange(id: string, value: string, controls: SettingsPanelControls): void;
}

export async function openSettingsPanel(
  ctx: ExtensionContext,
  config: SettingsPanelConfig,
): Promise<void> {
  await ctx.ui.custom<void>((tui, theme, _kb, done) => {
    const container = new Container();
    container.addChild(new Text(theme.fg("accent", theme.bold(config.title))));

    const settingsList = new SettingsList(
      config.buildItems(theme),
      LIST_HEIGHT,
      getSettingsListTheme(),
      (id: string, value: string) => {
        config.onChange(id, value, {
          updateValue: (itemId: string, nextValue: string) =>
            settingsList.updateValue(itemId, nextValue),
          requestRender: () => tui.requestRender(),
        });
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
