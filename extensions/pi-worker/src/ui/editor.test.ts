import test from "node:test";
import assert from "node:assert/strict";
import { installWorkerEditor } from "./editor";

test("installWorkerEditor restores previous editor component", () => {
  const previousEditor = () => ({}) as never;
  let currentEditor: unknown = previousEditor;

  const restore = installWorkerEditor(
    {
      ui: {
        getEditorComponent: () => currentEditor as never,
        setEditorComponent: (next: unknown) => {
          currentEditor = next;
        },
      },
    } as never,
    {},
  );

  assert.notEqual(currentEditor, previousEditor);
  restore();
  assert.equal(currentEditor, previousEditor);
});
