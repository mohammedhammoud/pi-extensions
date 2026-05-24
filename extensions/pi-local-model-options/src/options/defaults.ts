import os from "node:os";
import path from "node:path";
import type { ModelOptions, Store } from "./types.js";

export const STATUS_KEY = "local-options";
export const STORE_PATH = path.join(
  os.homedir(),
  ".pi",
  "agent",
  "local-options.json",
);
export const EMPTY_STORE: Store = { version: 1, models: {} };
export const EMPTY_OPTIONS: ModelOptions = { enabled: false };
export const SETTING_LIST_HEIGHT = 8;
export const INPUT_HINT = "Enter to save • Esc cancel";
