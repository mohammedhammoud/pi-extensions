import test from "node:test";
import assert from "node:assert/strict";
import { buildWorkerTask, parseCommandArgs } from "./task";

test("parseCommandArgs parses outputs and refine", () => {
  assert.deepEqual(parseCommandArgs(""), { action: "run" });
  assert.deepEqual(parseCommandArgs("outputs"), { action: "outputs" });
  assert.deepEqual(parseCommandArgs("refine"), { action: "refine" });
  assert.deepEqual(parseCommandArgs("refine foo/bar.md"), {
    action: "refine",
    path: "foo/bar.md",
  });
});

test("buildWorkerTask prefixes mode prompts", () => {
  assert.equal(buildWorkerTask("task", " hi "), "hi");
  assert.match(buildWorkerTask("plan", "x") ?? "", /^Mode: plan\./);
  assert.match(buildWorkerTask("implement", "x") ?? "", /^Mode: implement\./);
  assert.match(buildWorkerTask("review", "x") ?? "", /^Mode: review\./);
  assert.equal(buildWorkerTask("task", "   "), undefined);
});
