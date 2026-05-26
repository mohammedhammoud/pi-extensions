import test from "node:test";
import assert from "node:assert/strict";
import { createWorkerFinishMessage, formatWorkerWidget } from "./report";

test("createWorkerFinishMessage includes plan path when present", () => {
  const message = createWorkerFinishMessage(
    "local/qwen",
    "prompt",
    "outputs/run.md",
    {
      status: "success",
      stdout: "",
      stderr: "",
      assistantText: "done",
      code: 0,
      durationMs: 1000,
    },
    "plans/plan.md",
    "used plan",
  );

  assert.equal(message.details.prompt, "prompt");
  assert.equal(message.details.planPath, "plans/plan.md");
  assert.equal(message.details.planLabel, "used plan");
  assert.match(message.content, /used plan: plans\/plan\.md/);
});

test("formatWorkerWidget shows only model and duration", () => {
  const lines = formatWorkerWidget({
    model: { provider: "local", id: "qwen", contextWindow: 33_000 },
    prompt: "task",
    startedAt: Date.now(),
    assistantText: "",
    stdoutLines: [],
    stderrLines: [],
  });

  assert.equal(lines.length, 2);
});
