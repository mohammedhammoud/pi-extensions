import test from "node:test";
import assert from "node:assert/strict";
import { buildWorkerTask } from "./task";

test("buildWorkerTask prefixes mode prompts", () => {
  assert.equal(buildWorkerTask("task", " hi "), "hi");
  assert.match(buildWorkerTask("plan", "x") ?? "", /^Mode: plan\./);
  assert.match(buildWorkerTask("implement", "x") ?? "", /^Mode: implement\./);
  assert.match(buildWorkerTask("review", "x") ?? "", /^Mode: review\./);
  assert.equal(buildWorkerTask("task", "   "), undefined);
});
