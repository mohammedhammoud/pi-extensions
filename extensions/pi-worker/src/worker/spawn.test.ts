import test from "node:test";
import assert from "node:assert/strict";
import { buildWorkerArgs } from "./spawn";

test("buildWorkerArgs keeps worker isolated with no-session", () => {
  assert.deepEqual(
    buildWorkerArgs({ provider: "local", id: "qwen" }, "hello"),
    ["--no-session", "--model", "local/qwen", "--mode", "json", "hello"],
  );
});
