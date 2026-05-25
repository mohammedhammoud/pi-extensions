import type { ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";
import {
  Container,
  fuzzyFilter,
  getKeybindings,
  Input,
  SelectList,
  Text,
  type SelectItem,
} from "@earendil-works/pi-tui";

const LIST_HEIGHT = 12;
const HINT_TEXT = "type to filter • Enter select • Esc cancel";

export interface SearchSelectOption {
  value: string;
  label: string;
  searchText?: string;
}

interface SearchSelectConfig {
  defaultItems?: Array<string | SearchSelectOption>;
}

interface IndexedSelectItem extends SelectItem {
  searchText: string;
}

export async function openSearchSelect(
  ctx: ExtensionContext,
  title: string,
  items: Array<string | SearchSelectOption>,
  config: SearchSelectConfig = {},
): Promise<string | undefined> {
  const allItems = items.map(toSelectItem);
  const defaultItems = (config.defaultItems ?? items).map(toSelectItem);

  return await ctx.ui.custom<string | undefined>((tui, theme, _kb, done) => {
    const input = new Input();
    const container = new Container();
    const titleText = new Text(theme.fg("accent", theme.bold(title)));
    const hintText = new Text(theme.fg("dim", HINT_TEXT));
    let list = createSelectList(defaultItems, theme, done);

    input.focused = true;
    input.onSubmit = () => {
      const selected = list.getSelectedItem();
      done(selected ? String(selected.value) : undefined);
    };
    input.onEscape = () => done(undefined);

    const renderList = (): void => {
      const query = input.getValue().trim();
      list = createSelectList(
        query ? filterItems(allItems, query) : defaultItems,
        theme,
        done,
      );
      container.clear();
      container.addChild(titleText);
      container.addChild(input);
      container.addChild(list);
      container.addChild(hintText);
    };

    renderList();

    return {
      render: (width: number) => container.render(width),
      invalidate: () => container.invalidate(),
      handleInput: (data: string) => {
        if (isListInput(data)) {
          list.handleInput(data);
          return;
        }

        input.handleInput(data);
        renderList();
        tui.requestRender();
      },
    };
  });
}

function toSelectItem(item: string | SearchSelectOption): IndexedSelectItem {
  if (typeof item === "string") {
    return { value: item, label: item, searchText: item.toLowerCase() };
  }

  return {
    value: item.value,
    label: item.label,
    searchText: `${item.label} ${item.searchText ?? ""}`.toLowerCase(),
  };
}

function createSelectList(
  items: IndexedSelectItem[],
  theme: Theme,
  done: (value?: string) => void,
): SelectList {
  const list = new SelectList(items, LIST_HEIGHT, {
    selectedPrefix: (text: string) => theme.fg("accent", text),
    selectedText: (text: string) => theme.fg("accent", text),
    description: (text: string) => theme.fg("muted", text),
    scrollInfo: (text: string) => theme.fg("dim", text),
    noMatch: (text: string) => theme.fg("warning", text),
  });

  list.onSelect = (item: SelectItem) => done(String(item.value));
  list.onCancel = () => done(undefined);
  return list;
}

function isListInput(data: string): boolean {
  const kb = getKeybindings();
  const bindings = [
    "tui.select.up",
    "tui.select.down",
    "tui.select.confirm",
    "tui.select.cancel",
  ] as const;
  return bindings.some((binding) => kb.matches(data, binding));
}

function filterItems(
  items: IndexedSelectItem[],
  query: string,
): IndexedSelectItem[] {
  if (!query) return items;

  const directMatches = items.filter((item) =>
    item.searchText.includes(query.toLowerCase()),
  );
  if (directMatches.length > 0) return directMatches;

  return fuzzyFilter(items, query, (item) => item.searchText);
}
