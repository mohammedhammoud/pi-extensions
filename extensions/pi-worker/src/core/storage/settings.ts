import fs from "node:fs";
import path from "node:path";
import { STORE_VERSION } from "./artifact-index";
import { getWorkerSettingsPath } from "./layout";
import { isRecord } from "../../shared/guards";

export interface WorkerSettings {
  timeoutMs?: number;
}

interface Store {
  version: 1;
  settings: {
    timeoutMs: number | null;
  };
}

const DEFAULT_WORKER_SETTINGS: WorkerSettings = {
  timeoutMs: 2 * 60_000,
};

function toStore(settings: WorkerSettings): Store {
  return {
    version: STORE_VERSION,
    settings: {
      timeoutMs: settings.timeoutMs ?? null,
    },
  };
}

function isStore(value: unknown): value is Store {
  if (!isRecord(value)) return false;
  if (value.version !== STORE_VERSION) return false;
  if (!isRecord(value.settings)) return false;
  const { timeoutMs } = value.settings;
  return timeoutMs === null || typeof timeoutMs === "number";
}

export function loadWorkerSettings(): WorkerSettings {
  try {
    const storePath = getWorkerSettingsPath();
    if (!fs.existsSync(storePath)) {
      return { ...DEFAULT_WORKER_SETTINGS };
    }
    const raw = JSON.parse(fs.readFileSync(storePath, "utf8")) as unknown;
    return isStore(raw)
      ? raw.settings.timeoutMs === null
        ? {}
        : { timeoutMs: raw.settings.timeoutMs }
      : { ...DEFAULT_WORKER_SETTINGS };
  } catch (error) {
    console.warn("[pi-worker] Failed to load worker settings:", error);
    return { ...DEFAULT_WORKER_SETTINGS };
  }
}

export function saveWorkerSettings(settings: WorkerSettings): void {
  const storePath = getWorkerSettingsPath();
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  fs.writeFileSync(storePath, JSON.stringify(toStore(settings)));
}
