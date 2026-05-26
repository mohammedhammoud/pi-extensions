export const WORKER_UI_KEY = "pi-worker";

export const WORKER_MESSAGES = {
  busy: "Worker already running",
  waitForIdle: "Wait for current turn to finish",
  promptEmpty: "Empty task",
  noModels: "No models available",
  planRequired: "Plan required",
  planUnavailable: "Plan file no longer exists",
  running: "Running in isolated worker session.",
} as const;

export const WORKER_MESSAGE_TITLES = {
  report: "Worker report",
  outputs: "Worker outputs",
  started: "Worker started",
} as const;

export const WORKER_FIELD_LABELS = {
  model: "model",
  output: "output",
  plan: "plan",
  prompt: "prompt: ",
  stderr: "stderr: ",
  activity: "activity",
} as const;

export const WORKER_PANEL_COPY = {
  model: "Model",
  mode: "Mode",
  timeout: "Timeout",
  plan: "Plan",
  continue: "Continue",
  noPlan: "-",
  hint: "↑↓ select • Enter change/continue • Esc cancel",
} as const;

export const SEARCH_SELECT_HINT = "type to filter • Enter select • Esc cancel";
export const PLAN_PREVIEW_HINT =
  "↑↓ scroll • PgUp/PgDn jump • Home/End • Enter/Esc back";
