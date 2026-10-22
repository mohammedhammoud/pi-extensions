import assert from "node:assert/strict";
import { test } from "node:test";
import { loadPlanForExecution } from "./execution";
import type { Plan } from "./store";

const plan: Plan = {
  id: "01234567-89ab-4cde-8fab-0123456789ab",
  title: "Example plan",
  projectPath: "/project",
  createdAt: "now",
  updatedAt: "now",
  status: "active",
  path: "/plans/project/active/plan.md",
  body: "# Example plan\n\n1. Inspect code.\n2. Implement changes.",
  source: "original document",
};

function createUI(draft = "", approval = false) {
  return {
    text: draft,
    confirmations: 0,
    notices: [] as string[],
    getEditorText() {
      return this.text;
    },
    setEditorText(text: string) {
      this.text = text;
    },
    async confirm() {
      this.confirmations++;
      return approval;
    },
    notify(message: string) {
      this.notices.push(message);
    },
  };
}

test("loads plan contents into the editor without executing or changing status", async () => {
  const ui = createUI();
  const before = { ...plan };
  await loadPlanForExecution(ui, plan, new AbortController().signal);
  assert.ok(ui.text.includes(plan.body));
  assert.ok(ui.text.includes(plan.path));
  assert.match(ui.text, /Implement the following plan/);
  assert.equal(ui.confirmations, 0);
  assert.match(ui.notices[0]!, /Review and submit/);
  assert.deepEqual(plan, before);
});

test("preserves existing editor text when replacement is declined", async () => {
  const ui = createUI("unfinished prompt");
  await loadPlanForExecution(ui, plan, new AbortController().signal);
  assert.equal(ui.text, "unfinished prompt");
  assert.equal(ui.confirmations, 1);
  assert.deepEqual(ui.notices, []);
});

test("replaces existing editor text only after confirmation", async () => {
  const ui = createUI("unfinished prompt", true);
  await loadPlanForExecution(ui, plan, new AbortController().signal);
  assert.ok(ui.text.includes(plan.body));
  assert.equal(ui.confirmations, 1);
});

test("does not alter the editor when cancelled", async () => {
  const ui = createUI();
  const controller = new AbortController();
  controller.abort();
  await loadPlanForExecution(ui, plan, controller.signal);
  assert.equal(ui.text, "");
  assert.deepEqual(ui.notices, []);
});

test("does not alter the editor when cancelled during confirmation", async () => {
  const ui = createUI("unfinished prompt", true);
  const controller = new AbortController();
  ui.confirm = async () => {
    controller.abort();
    return true;
  };
  await loadPlanForExecution(ui, plan, controller.signal);
  assert.equal(ui.text, "unfinished prompt");
  assert.deepEqual(ui.notices, []);
});
