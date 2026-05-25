import test from "node:test";
import assert from "node:assert/strict";
import { summarizeToolStart, truncateCommand } from "./tools";

test("truncateCommand trims long commands", () => {
  const long = "x".repeat(80);
  assert.equal(truncateCommand("echo ok"), "echo ok");
  assert.equal(truncateCommand(long).length, 63);
  assert.ok(truncateCommand(long).endsWith("..."));
});

test("summarizeToolStart formats known tools", () => {
  assert.equal(summarizeToolStart("read", { path: "a.txt" }), "read a.txt");
  assert.equal(summarizeToolStart("write", { path: "a.txt" }), "write a.txt");
  assert.equal(summarizeToolStart("unknown", {}), "run unknown");
  assert.match(summarizeToolStart("bash", { command: "echo hi" }), /^bash /);
});
