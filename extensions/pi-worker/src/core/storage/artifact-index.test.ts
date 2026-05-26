import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  dedupeArtifacts,
  readArtifactIds,
  readRecentArtifactRefs,
  updateArtifactIndexes,
} from "./artifact-index";

test("artifact indexes stay shared and deduped", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pi-worker-artifacts-"));
  const globalIndexPath = path.join(root, "index", "all.json");
  const repoIndexPath = path.join(root, "repos", "repo-a", "index.json");

  try {
    await updateArtifactIndexes(
      globalIndexPath,
      repoIndexPath,
      "repo-a",
      "one",
    );
    await updateArtifactIndexes(
      globalIndexPath,
      repoIndexPath,
      "repo-a",
      "two",
    );
    await updateArtifactIndexes(
      globalIndexPath,
      repoIndexPath,
      "repo-a",
      "one",
    );

    assert.deepEqual(await readArtifactIds(repoIndexPath), ["one", "two"]);
    assert.deepEqual(await readRecentArtifactRefs(globalIndexPath), [
      { repoId: "repo-a", artifactId: "one" },
      { repoId: "repo-a", artifactId: "two" },
    ]);
    assert.deepEqual(
      dedupeArtifacts([
        { id: "a", value: 1 },
        { id: "b", value: 2 },
        { id: "a", value: 3 },
      ]),
      [
        { id: "a", value: 1 },
        { id: "b", value: 2 },
      ],
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
