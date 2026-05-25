import test from "node:test";
import assert from "node:assert/strict";
import {
  appendWorkerStderr,
  appendWorkerStdout,
  createState,
  startWorkerRun,
} from "./state";

test("appendWorkerStdout keeps recent unique lines", () => {
  const state = createState();
  startWorkerRun(state, { provider: "p", id: "m" }, "task");

  appendWorkerStdout(state, "one");
  appendWorkerStdout(state, "one");
  appendWorkerStdout(state, "two");

  assert.deepEqual(state.worker?.stdoutLines, ["one", "two"]);
});

test("appendWorkerStderr trims and caps history", () => {
  const state = createState();
  startWorkerRun(state, { provider: "p", id: "m" }, "task");

  for (let index = 0; index < 8; index += 1) {
    appendWorkerStderr(state, ` line-${index} `);
  }

  assert.deepEqual(state.worker?.stderrLines, [
    "line-2",
    "line-3",
    "line-4",
    "line-5",
    "line-6",
    "line-7",
  ]);
});
