import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadWorkerSettings, saveWorkerSettings, getStorePath } from "./store";

test("loadWorkerSettings reads only the global worker path", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "pi-worker-store-"));
  const previousHome = process.env.HOME;
  process.env.HOME = home;

  try {
    const ignoredOldPath = path.join(home, ".pi", "agent", "worker.json");
    fs.mkdirSync(path.dirname(ignoredOldPath), { recursive: true });
    fs.writeFileSync(
      ignoredOldPath,
      JSON.stringify({ version: 1, settings: { timeoutMs: 5000 } }),
    );

    assert.deepEqual(loadWorkerSettings(), { timeoutMs: 120000 });

    saveWorkerSettings({ timeoutMs: 9000 });

    assert.equal(fs.existsSync(getStorePath()), true);
    assert.deepEqual(JSON.parse(fs.readFileSync(getStorePath(), "utf8")), {
      version: 1,
      settings: { timeoutMs: 9000 },
    });
  } finally {
    process.env.HOME = previousHome;
    fs.rmSync(home, { recursive: true, force: true });
  }
});
