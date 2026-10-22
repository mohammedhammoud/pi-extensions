import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { test } from "node:test";
import { PlanStore, parsePlan, resolveProject, serializePlan } from "./store";

async function fixture(t: { after: (cleanup: () => Promise<void>) => void }) {
  const directory = await mkdtemp(join(tmpdir(), "pi-plan-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return { directory, store: new PlanStore(join(directory, "plans")) };
}

test("creates UUID Markdown documents with round-trippable metadata", async (t) => {
  const { directory, store } = await fixture(t);
  const project = join(directory, "project");
  const plan = await store.create(
    project,
    'Title: "quoted" 🚀',
    "# Title\n\nSteps",
  );
  assert.equal(plan.status, "active");
  assert.match(plan.path, /active\/[0-9a-f-]{36}\.md$/);
  assert.equal(
    parsePlan(await readFile(plan.path, "utf8")).metadata.title,
    plan.title,
  );
  assert.deepEqual(await store.list(project, "active"), [plan]);
  assert.deepEqual(await store.list(project, "done"), []);
});

test("isolates projects sharing a root folder name and duplicate plan titles", async (t) => {
  const { directory, store } = await fixture(t);
  const first = join(directory, "one", "app");
  const second = join(directory, "two", "app");
  const a = await store.create(first, "Same title", "# Same title");
  const b = await store.create(second, "Same title", "# Same title");
  assert.notEqual(a.id, b.id);
  assert.deepEqual(
    (await store.list(first, "active")).map((p) => p.id),
    [a.id],
  );
  assert.deepEqual(
    (await store.list(second, "active")).map((p) => p.id),
    [b.id],
  );
});

test("toggles status and trashes without changing document contents", async (t) => {
  const { directory, store } = await fixture(t);
  const project = join(directory, "app");
  const plan = await store.create(project, "Plan", "# Plan");
  await store.move(plan, "done");
  assert.deepEqual(await store.list(project, "active"), []);
  const done = (await store.list(project, "done"))[0]!;
  assert.equal(done.source, plan.source);
  await store.move(done, "active");
  const active = (await store.list(project, "active"))[0]!;
  await store.move(active, "trash");
  assert.deepEqual(await store.list(project, "active"), []);
  assert.equal(
    await readFile(
      join(directory, "plans", "app", "trash", `${plan.id}.md`),
      "utf8",
    ),
    plan.source,
  );
});

test("never overwrites an existing destination during status changes", async (t) => {
  const { directory, store } = await fixture(t);
  const plan = await store.create(join(directory, "app"), "Plan", "# Plan");
  const doneDirectory = join(directory, "plans", "app", "done");
  await mkdir(doneDirectory);
  await writeFile(join(doneDirectory, `${plan.id}.md`), "existing");
  await assert.rejects(store.move(plan, "done"), { code: "EEXIST" });
  assert.equal(await readFile(plan.path, "utf8"), plan.source);
  assert.equal(
    await readFile(join(doneDirectory, `${plan.id}.md`), "utf8"),
    "existing",
  );
});

test("revisions preserve identity and status, and clean temporary files", async (t) => {
  const { directory, store } = await fixture(t);
  const project = join(directory, "app");
  const initial = await store.create(project, "Original", "# Original");
  await store.move(initial, "done");
  const plan = (await store.list(project, "done"))[0]!;
  await store.revise(plan, "Revised", "# Revised\n\nNew steps");
  const revised = (await store.list(project, "done"))[0]!;
  assert.equal(revised.id, plan.id);
  assert.equal(revised.createdAt, plan.createdAt);
  assert.equal(revised.projectPath, plan.projectPath);
  assert.equal(revised.title, "Revised");
  assert.deepEqual(await readdir(join(directory, "plans", "app", "done")), [
    `${plan.id}.md`,
  ]);
});

test("refuses a revision after an external edit", async (t) => {
  const { directory, store } = await fixture(t);
  const plan = await store.create(join(directory, "app"), "Plan", "# Plan");
  await writeFile(plan.path, `${plan.source}\nManual edit\n`);
  await assert.rejects(
    store.revise(plan, "Replacement", "# Replacement"),
    /Plan changed/,
  );
  assert.match(await readFile(plan.path, "utf8"), /Manual edit/);
  assert.deepEqual(await readdir(join(directory, "plans", "app", "active")), [
    `${plan.id}.md`,
  ]);
});

test("reports invalid metadata instead of silently hiding documents", async (t) => {
  const { directory, store } = await fixture(t);
  const project = join(directory, "app");
  const plan = await store.create(project, "Plan", "# Plan");
  await writeFile(plan.path, "# metadata removed");
  await assert.rejects(store.list(project, "active"), /Invalid plan document/);
  assert.throws(
    () => parsePlan("---\nid: 42\n---\n# Plan"),
    /Invalid plan metadata/,
  );
});

test("supports CRLF and titles containing metadata delimiters", async () => {
  const metadata = {
    id: "01234567-89ab-4cde-8fab-0123456789ab",
    title: "A\n---\nB",
    projectPath: "/project",
    createdAt: "now",
    updatedAt: "now",
  };
  assert.deepEqual(
    parsePlan(serializePlan(metadata, "# Plan").replace(/\n/g, "\r\n"))
      .metadata,
    metadata,
  );
});

test("resolves Git root from nested directories, or cwd outside Git", async (t) => {
  const { directory } = await fixture(t);
  const root = join(directory, "repo");
  const nested = join(root, "nested");
  await mkdir(nested, { recursive: true });
  await promisify(execFile)("git", ["init", root]);
  const resolved = await resolveProject(root);
  assert.equal(await resolveProject(nested), resolved);
  const outside = join(directory, "outside");
  await mkdir(outside);
  assert.match(await resolveProject(outside), /outside$/);
});
