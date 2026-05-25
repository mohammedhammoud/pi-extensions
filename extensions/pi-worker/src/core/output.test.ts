import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildReuseOutputPrompt,
  formatWorkerOutputLabel,
  listWorkerOutputs,
  resolveWorkerOutputPath,
  saveWorkerOutput,
} from "./output";

test("saveWorkerOutput stores global outputs and lists current repo first", async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "pi-worker-home-"));
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "pi-worker-repo-"));
  const previousHome = process.env.HOME;
  process.env.HOME = home;

  try {
    const first = await saveWorkerOutput(
      repo,
      "local/model-a",
      "task",
      "first prompt",
      {
        status: "success",
        stdout: "",
        stderr: "",
        assistantText: "first output",
        code: 0,
        durationMs: 1000,
      },
      "new-task",
    );

    await new Promise((resolve) => setTimeout(resolve, 5));

    const second = await saveWorkerOutput(
      repo,
      "local/model-b",
      "plan",
      "second prompt",
      {
        status: "error",
        stdout: "",
        stderr: "boom",
        assistantText: "",
        code: 1,
        durationMs: 2000,
      },
      "refine-output",
    );

    assert.equal(
      first.path.startsWith(path.join(home, ".pi", "worker", "outputs")),
      true,
    );

    const listed = await listWorkerOutputs(repo);
    assert.equal(listed.length >= 2, true);
    assert.equal(listed[0]?.id, second.id);
    assert.equal(listed[1]?.id, first.id);
    assert.match(formatWorkerOutputLabel(listed[0]!), /model-b/);

    const resolved = await resolveWorkerOutputPath(repo, second.id);
    assert.equal(resolved?.path, second.path);
    assert.match(
      buildReuseOutputPrompt(second),
      /Use the existing worker output file at/,
    );
    assert.match(
      buildReuseOutputPrompt(second),
      new RegExp(second.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
  } finally {
    process.env.HOME = previousHome;
    fs.rmSync(home, { recursive: true, force: true });
    fs.rmSync(repo, { recursive: true, force: true });
  }
});
