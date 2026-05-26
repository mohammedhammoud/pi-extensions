import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildWorkerTask } from "../../worker/request";
import {
  formatWorkerOutputLabel,
  listWorkerOutputs,
  saveWorkerOutput,
} from "./store";

test("saveWorkerOutput stores repo-grouped outputs", async () => {
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
    );

    await new Promise((resolve) => setTimeout(resolve, 5));

    const planPath = path.join(
      home,
      ".pi",
      "worker",
      "repos",
      "repo-id",
      "plans",
      "selected.md",
    );
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
      planPath,
    );

    assert.equal(
      first.path.startsWith(
        path.join(home, ".pi", "worker", "repos", first.repoId, "outputs"),
      ),
      true,
    );

    const listed = await listWorkerOutputs(repo);
    assert.equal(listed.length >= 2, true);
    assert.equal(listed[0]?.id, second.id);
    assert.equal(listed[1]?.id, first.id);
    assert.match(formatWorkerOutputLabel(listed[0]!), /second prompt/);
    assert.match(formatWorkerOutputLabel(listed[0]!), /model-b/);
    assert.equal(listed[0]?.planPath, planPath);
    assert.equal(listed[0]?.sourceType, "plan");
    assert.match(
      fs.readFileSync(second.path, "utf8"),
      /Plan: ~\/\.pi\/worker\/repos\/repo-id\/plans\/selected\.md/,
    );
  } finally {
    process.env.HOME = previousHome;
    fs.rmSync(home, { recursive: true, force: true });
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test("saveWorkerOutput uses display prompt for labels when task includes worker directives", async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "pi-worker-home-"));
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "pi-worker-repo-"));
  const previousHome = process.env.HOME;
  process.env.HOME = home;

  try {
    const prompt = "investigate worker crash";
    const task = buildWorkerTask("task", prompt) ?? "";
    const output = await saveWorkerOutput(
      repo,
      "local/model-a",
      "task",
      task,
      {
        status: "success",
        stdout: "",
        stderr: "",
        assistantText: "first output",
        code: 0,
        durationMs: 1000,
      },
      undefined,
      prompt,
    );

    assert.match(formatWorkerOutputLabel(output), /investigate worker crash/);
    assert.match(fs.readFileSync(output.path, "utf8"), /You are a repo worker/);
  } finally {
    process.env.HOME = previousHome;
    fs.rmSync(home, { recursive: true, force: true });
    fs.rmSync(repo, { recursive: true, force: true });
  }
});
