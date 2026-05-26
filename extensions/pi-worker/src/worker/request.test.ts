import test from "node:test";
import assert from "node:assert/strict";
import { buildWorkerTask, compileWorkerRequest } from "./request";

const plan = {
  id: "p",
  path: "/tmp/plan.md",
  relativePath: "../tmp/plan.md",
  createdAt: 1,
  updatedAt: 1,
  repoId: "r",
  repoName: "repo",
  modelKey: "local/model",
  promptPreview: "prompt",
  available: true,
};

test("buildWorkerTask injects worker instructions", () => {
  const taskPrompt = buildWorkerTask("task", " hi ") ?? "";
  assert.match(taskPrompt, /^Mode: task\./);
  assert.match(taskPrompt, /Inspect the requested paths before answering\./);
  assert.match(taskPrompt, /Task:\nhi$/);

  assert.match(buildWorkerTask("plan", "x") ?? "", /^Mode: plan\./);
  assert.match(buildWorkerTask("refine", "x", plan) ?? "", /^Mode: refine\./);
  assert.match(
    buildWorkerTask("implement", "x", plan) ?? "",
    /^Mode: implement\./,
  );
  assert.match(buildWorkerTask("review", "x") ?? "", /^Mode: review\./);
  assert.match(
    buildWorkerTask("implement", "", plan) ?? "",
    /Use the worker plan file at "/,
  );
  assert.equal(buildWorkerTask("task", "   "), undefined);
});

test("compileWorkerRequest keeps raw and compiled prompts together", () => {
  const request = compileWorkerRequest({
    model: { provider: "local", id: "qwen", label: "local/qwen" },
    mode: "implement",
    prompt: "ship it",
    timeoutMs: 120_000,
    selectedPlan: plan,
  });

  assert.equal(request?.rawPrompt, "ship it");
  assert.equal(request?.mode, "implement");
  assert.equal(request?.selectedPlan?.id, "p");
  assert.match(request?.compiledPrompt ?? "", /^Mode: implement\./);
});
