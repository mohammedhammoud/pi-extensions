import test from "node:test";
import assert from "node:assert/strict";
import {
  cycleWorkerMode,
  getWorkerModeColor,
  getWorkerModeDirectives,
  isWorkerMode,
  requiresWorkerPlan,
  showsWorkerPlan,
} from "./definition";

test("worker mode registry stays aligned", () => {
  assert.equal(isWorkerMode("task"), true);
  assert.equal(isWorkerMode("nope"), false);

  assert.equal(cycleWorkerMode("task"), "plan");
  assert.equal(getWorkerModeColor("plan"), "warning");
  assert.equal(requiresWorkerPlan("implement"), true);
  assert.equal(requiresWorkerPlan("review"), false);
  assert.equal(showsWorkerPlan("review"), true);
  assert.equal(showsWorkerPlan("task"), false);
  assert.match(getWorkerModeDirectives("refine").join("\n"), /^Mode: refine\./);
});
