import type { Theme } from "@earendil-works/pi-coding-agent";
import {
  Container,
  Input,
  SelectList,
  Text,
  type Component,
  type SelectItem,
} from "@earendil-works/pi-tui";
import { LIST_HEIGHT, SELECT_DIALOG_HINT } from "./constants";

function createDialogContainer(title: string, theme: Theme): Container {
  const container = new Container();
  container.addChild(new Text(theme.fg("accent", theme.bold(title))));
  return container;
}

function createInput(prefill: string, done: (value?: string) => void): Input {
  const input = new Input();
  input.setValue(prefill);
  input.onSubmit = (value) => done(value);
  input.onEscape = () => done(undefined);
  return input;
}

function createSelectList(
  items: SelectItem[],
  theme: Theme,
  done: (value?: string) => void,
): SelectList {
  const list = new SelectList(items, Math.min(items.length, LIST_HEIGHT), {
    selectedPrefix: (text: string) => theme.fg("accent", text),
    selectedText: (text: string) => theme.fg("accent", text),
    description: (text: string) => theme.fg("muted", text),
    scrollInfo: (text: string) => theme.fg("dim", text),
    noMatch: (text: string) => theme.fg("warning", text),
  });
  list.onSelect = (item: SelectItem) => done(item.value);
  list.onCancel = () => done(undefined);
  return list;
}

export function createInputDialog(
  title: string,
  prefill: string,
  hint: string,
  theme: Theme,
  done: (value?: string) => void,
): Component {
  const input = createInput(prefill, done);
  const container = createDialogContainer(title, theme);
  container.addChild(input);
  container.addChild(new Text(theme.fg("dim", hint)));

  return {
    render: (width: number) => container.render(width),
    invalidate: () => container.invalidate(),
    handleInput: (data: string) => input.handleInput(data),
  };
}

export function createSelectDialog(
  title: string,
  items: SelectItem[],
  theme: Theme,
  done: (value?: string) => void,
): Component {
  const list = createSelectList(items, theme, done);
  const container = createDialogContainer(title, theme);
  container.addChild(list);
  container.addChild(new Text(theme.fg("dim", SELECT_DIALOG_HINT)));

  return {
    render: (width: number) => container.render(width),
    invalidate: () => container.invalidate(),
    handleInput: (data: string) => list.handleInput(data),
  };
}
