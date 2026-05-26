import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_WORKER_TIMEOUT_MS,
  cycleWorkerTimeout,
  formatTimeout,
  parseTimeoutLabel,
} from "./timeout";

test("timeout helpers stay aligned", () => {
  assert.equal(DEFAULT_WORKER_TIMEOUT_MS, 120000);
  assert.equal(cycleWorkerTimeout(120000), 300000);
  assert.equal(cycleWorkerTimeout(0), 120000);
  assert.equal(formatTimeout(600000), "10m");
  assert.equal(parseTimeoutLabel("5m"), 300000);
  assert.equal(parseTimeoutLabel("off"), 0);
});
