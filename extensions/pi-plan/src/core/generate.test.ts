import assert from "node:assert/strict";
import { test } from "node:test";
import { parseGeneratedPlan } from "./generate";

test("extracts the title from generated Markdown", () => {
  assert.deepEqual(
    parseGeneratedPlan("\n# Project plan\n\n## Steps\n1. Build it.\n"),
    {
      title: "Project plan",
      body: "# Project plan\n\n## Steps\n1. Build it.",
    },
  );
});

test("rejects empty, fenced, or untitled output", () => {
  for (const value of [
    "",
    "Plain text",
    "```md\n# Title\n```",
    "## Subtitle",
  ]) {
    assert.throws(() => parseGeneratedPlan(value), /Nothing saved/);
  }
});
