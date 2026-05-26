import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildWorkerTask } from "../../worker/request";
import { getWorkerPlanDisplayName } from "./labels";
import {
  listAllWorkerPlans,
  listWorkerPlans,
  overwriteWorkerPlan,
  saveWorkerPlan,
} from "./store";

function createResult(assistantText: string) {
  return {
    status: "success" as const,
    stdout: "",
    stderr: "",
    assistantText,
    code: 0,
    durationMs: 1000,
  };
}

test("saveWorkerPlan stores repo-grouped plans and refine overwrites the same plan", async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "pi-worker-plan-home-"));
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "pi-worker-plan-repo-"));
  const previousHome = process.env.HOME;
  process.env.HOME = home;

  try {
    const plan = await saveWorkerPlan(
      repo,
      "local/model-a",
      "first prompt",
      createResult("first plan"),
    );

    assert.equal(
      plan.path.startsWith(
        path.join(home, ".pi", "worker", "repos", plan.repoId, "plans"),
      ),
      true,
    );
    assert.equal(fs.readFileSync(plan.path, "utf8"), "first plan");

    const updated = await overwriteWorkerPlan(
      plan,
      "local/model-b",
      "second prompt",
      createResult("second plan"),
    );

    assert.equal(updated.id, plan.id);
    assert.equal(updated.path, plan.path);
    assert.equal(fs.readFileSync(plan.path, "utf8"), "second plan");

    const listed = await listWorkerPlans(repo);
    assert.equal(listed[0]?.id, plan.id);
    assert.equal(getWorkerPlanDisplayName(listed[0]!), "second prompt");
  } finally {
    process.env.HOME = previousHome;
    fs.rmSync(home, { recursive: true, force: true });
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test("listWorkerPlans hides unavailable plans", async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "pi-worker-plan-home-"));
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "pi-worker-plan-repo-"));
  const previousHome = process.env.HOME;
  process.env.HOME = home;

  try {
    const plan = await saveWorkerPlan(
      repo,
      "local/model-a",
      "first prompt",
      createResult("first plan"),
    );

    fs.rmSync(plan.path, { force: true });

    assert.deepEqual(await listWorkerPlans(repo), []);
    assert.deepEqual(await listAllWorkerPlans(), []);
  } finally {
    process.env.HOME = previousHome;
    fs.rmSync(home, { recursive: true, force: true });
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test("saveWorkerPlan uses display prompt for labels when task includes worker directives", async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "pi-worker-plan-home-"));
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "pi-worker-plan-repo-"));
  const previousHome = process.env.HOME;
  process.env.HOME = home;

  try {
    const prompt = "fix flaky timeout test";
    const task = buildWorkerTask("plan", prompt) ?? "";
    const plan = await saveWorkerPlan(
      repo,
      "local/model-a",
      task,
      createResult("first plan"),
      prompt,
    );

    assert.equal(getWorkerPlanDisplayName(plan), prompt);
  } finally {
    process.env.HOME = previousHome;
    fs.rmSync(home, { recursive: true, force: true });
    fs.rmSync(repo, { recursive: true, force: true });
  }
});
