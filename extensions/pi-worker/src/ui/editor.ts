import {
  CustomEditor,
  type ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { Key, matchesKey } from "@earendil-works/pi-tui";
import type { ExtensionState } from "../core/session";

export function installWorkerEditor(
  ctx: ExtensionContext,
  state: ExtensionState,
): () => void {
  const previousEditor = ctx.ui.getEditorComponent();

  ctx.ui.setEditorComponent((tui, theme, keybindings) => {
    class WorkerEditor extends CustomEditor {
      override handleInput(data: string): void {
        if (matchesKey(data, Key.escape) && state.worker?.cancel) {
          state.worker.cancel();
          return;
        }

        super.handleInput(data);
      }
    }

    return new WorkerEditor(tui, theme, keybindings);
  });

  return () => {
    ctx.ui.setEditorComponent(previousEditor);
  };
}
