import type { WorkerPlan } from "../artifacts/plans/store";
import {
  getWorkerModeDirectives,
  type WorkerMode,
} from "../core/mode/definition";
import type { ModelInfo } from "../options/model/select";

const SHARED_DIRECTIVES = [
  "You are a repo worker running in an isolated pi session.",
  "Inspect the requested paths before answering.",
  "If the prompt mentions staged changes, inspect the staged diff before answering.",
  "Base claims on file contents, diffs, or command output.",
  "Do not ask broad follow-up questions when the prompt already names the target paths.",
  "Keep the response tight, concrete, and directly useful.",
];

export interface WorkerRequestDraft {
  model: ModelInfo;
  mode: WorkerMode;
  prompt: string;
  timeoutMs: number;
  selectedPlan?: WorkerPlan;
}

export interface WorkerRequest {
  model: ModelInfo;
  mode: WorkerMode;
  rawPrompt: string;
  compiledPrompt: string;
  timeoutMs: number;
  selectedPlan?: WorkerPlan;
}

export function compileWorkerRequest(
  draft: WorkerRequestDraft,
): WorkerRequest | undefined {
  const compiledPrompt = buildWorkerTask(
    draft.mode,
    draft.prompt,
    draft.selectedPlan,
  );
  if (!compiledPrompt) return undefined;

  return {
    model: draft.model,
    mode: draft.mode,
    rawPrompt: draft.prompt,
    compiledPrompt,
    timeoutMs: draft.timeoutMs,
    ...(draft.selectedPlan ? { selectedPlan: draft.selectedPlan } : {}),
  };
}

export function buildWorkerTask(
  mode: WorkerMode,
  prompt: string | undefined,
  plan?: WorkerPlan,
): string | undefined {
  const trimmed = prompt?.trim();
  if (!trimmed && !plan) return undefined;

  const sections = [
    [
      ...getWorkerModeDirectives(mode),
      ...SHARED_DIRECTIVES,
      plan ? buildPlanPrompt(plan) : undefined,
    ]
      .filter((value): value is string => Boolean(value))
      .join("\n"),
    trimmed ? ["Task:", trimmed].join("\n") : undefined,
  ].filter((value): value is string => Boolean(value));

  return sections.join("\n\n");
}

function buildPlanPrompt(plan: WorkerPlan): string {
  return `Use the worker plan file at "${plan.path}" as the plan source.`;
}
