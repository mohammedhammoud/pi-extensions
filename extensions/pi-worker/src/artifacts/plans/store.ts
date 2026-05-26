import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { WorkerResult } from "../../worker/types";
import {
  DEFAULT_PICKER_SHORTLIST_ITEMS,
  FRIENDLY_NAME_LIMIT,
  JSON_EXT,
  MAX_LIST_ITEMS,
  PROMPT_PREVIEW_LIMIT,
  STORE_VERSION,
  dedupeArtifacts,
  isArtifactMetaBase,
  readArtifactIds,
  readRecentArtifactRefs,
  updateArtifactIndexes,
} from "../../core/storage/artifact-index";
import {
  createFriendlyName,
  formatRelativePath,
  truncateInline,
} from "../../shared/format";
import { hasNumber, isRecord } from "../../shared/guards";
import {
  createArtifactId,
  ensureWorkerStorageLayout,
  exists,
  getPlanIndexPath,
  getRepoPlansDir,
  getRepoPlansMetaDir,
  readJson,
  resolveRepoInfo,
  writeJsonAtomic,
} from "../../core/storage/layout";

const PLAN_FILE_EXT = ".md";

export interface WorkerPlan {
  id: string;
  path: string;
  relativePath: string;
  createdAt: number;
  updatedAt: number;
  repoId: string;
  repoName: string;
  modelKey: string;
  promptPreview: string;
  friendlyName?: string;
  available: boolean;
}

interface WorkerPlanMeta {
  version: 1;
  id: string;
  repoId: string;
  repoPath: string;
  repoName: string;
  createdAt: number;
  updatedAt: number;
  modelKey: string;
  promptPreview: string;
  friendlyName?: string;
  planPath: string;
}

export async function saveWorkerPlan(
  cwd: string,
  modelKey: string,
  prompt: string,
  result: WorkerResult,
  displayPrompt = prompt,
): Promise<WorkerPlan> {
  await ensureWorkerStorageLayout();

  const repo = resolveRepoInfo(cwd);
  const id = createArtifactId(repo.id, modelKey, prompt, "plan");
  const createdAt = Date.now();
  const planPath = path.join(getRepoPlansDir(repo.id), `${id}${PLAN_FILE_EXT}`);
  const metaPath = getWorkerPlanMetaPath(repo.id, id);

  await mkdir(path.dirname(planPath), { recursive: true });
  await writeFile(planPath, getPlanText(result), "utf8");

  const meta: WorkerPlanMeta = {
    version: STORE_VERSION,
    id,
    repoId: repo.id,
    repoPath: repo.rootPath,
    repoName: repo.name,
    createdAt,
    updatedAt: createdAt,
    modelKey,
    promptPreview: truncateInline(displayPrompt, PROMPT_PREVIEW_LIMIT),
    friendlyName: createFriendlyName(
      displayPrompt,
      createdAt,
      FRIENDLY_NAME_LIMIT,
      "Plan",
    ),
    planPath,
  };

  await writeJsonAtomic(metaPath, meta);
  await updateArtifactIndexes(
    getPlanIndexPath(),
    getRepoPlanIndexPath(meta.repoId),
    meta.repoId,
    meta.id,
  );

  return toWorkerPlan(meta, true, cwd);
}

export async function overwriteWorkerPlan(
  plan: WorkerPlan,
  modelKey: string,
  prompt: string,
  result: WorkerResult,
  displayPrompt = prompt,
): Promise<WorkerPlan> {
  await ensureWorkerStorageLayout();

  const metaPath = getWorkerPlanMetaPath(plan.repoId, plan.id);
  const existing = await readJson(metaPath, isWorkerPlanMeta);
  const now = Date.now();
  const meta: WorkerPlanMeta = {
    version: STORE_VERSION,
    id: plan.id,
    repoId: existing?.repoId ?? plan.repoId,
    repoPath: existing?.repoPath ?? "",
    repoName: existing?.repoName ?? plan.repoName,
    createdAt: existing?.createdAt ?? plan.createdAt,
    updatedAt: now,
    modelKey,
    promptPreview: truncateInline(displayPrompt, PROMPT_PREVIEW_LIMIT),
    friendlyName: createFriendlyName(
      displayPrompt,
      existing?.createdAt ?? plan.createdAt,
      FRIENDLY_NAME_LIMIT,
      "Plan",
    ),
    planPath: existing?.planPath ?? plan.path,
  };

  await mkdir(path.dirname(meta.planPath), { recursive: true });
  await writeFile(meta.planPath, getPlanText(result), "utf8");
  await writeJsonAtomic(metaPath, meta);
  await updateArtifactIndexes(
    getPlanIndexPath(),
    getRepoPlanIndexPath(meta.repoId),
    meta.repoId,
    meta.id,
  );

  return toWorkerPlan(meta, true);
}

export async function listWorkerPlans(cwd: string): Promise<WorkerPlan[]> {
  await ensureWorkerStorageLayout();

  const repo = resolveRepoInfo(cwd);
  const ids = await readArtifactIds(getRepoPlanIndexPath(repo.id));
  if (!ids) return [];

  const plans = await Promise.all(
    ids.map(async (id) => await readWorkerPlanMeta(repo.id, id, cwd)),
  );
  return sortRecent(filterAvailablePlans(plans)).slice(0, MAX_LIST_ITEMS);
}

export async function listAllWorkerPlans(
  limit = MAX_LIST_ITEMS,
): Promise<WorkerPlan[]> {
  await ensureWorkerStorageLayout();

  const refs = await readRecentArtifactRefs(getPlanIndexPath());
  if (!refs) return [];

  const candidates = limit > 0 ? refs.slice(0, limit * 4) : refs;
  const plans = await Promise.all(
    candidates.map(
      async (entry) => await readWorkerPlanMeta(entry.repoId, entry.artifactId),
    ),
  );

  const resolvedPlans = sortRecent(filterAvailablePlans(plans));
  return limit > 0 ? resolvedPlans.slice(0, limit) : resolvedPlans;
}

export function getDefaultPlanPickerShortlist(
  repoPlans: WorkerPlan[],
  allPlans: WorkerPlan[],
  limit = DEFAULT_PICKER_SHORTLIST_ITEMS,
): WorkerPlan[] {
  return dedupeArtifacts([...repoPlans, ...allPlans]).slice(0, limit);
}

async function readWorkerPlanMeta(
  repoId: string,
  id: string,
  cwd?: string,
): Promise<WorkerPlan | undefined> {
  const raw = await readJson(
    getWorkerPlanMetaPath(repoId, id),
    isWorkerPlanMeta,
  );
  if (!raw) return undefined;

  const available = await exists(raw.planPath);
  return toWorkerPlan(raw, available, cwd);
}

function toWorkerPlan(
  meta: WorkerPlanMeta,
  available: boolean,
  cwd?: string,
): WorkerPlan {
  return {
    id: meta.id,
    path: meta.planPath,
    relativePath: cwd ? formatRelativePath(cwd, meta.planPath) : meta.planPath,
    createdAt: meta.createdAt,
    updatedAt: meta.updatedAt,
    repoId: meta.repoId,
    repoName: meta.repoName,
    modelKey: meta.modelKey,
    promptPreview: meta.promptPreview,
    ...(meta.friendlyName ? { friendlyName: meta.friendlyName } : {}),
    available,
  };
}

function getPlanText(result: WorkerResult): string {
  const text = (result.assistantText || result.stdout || result.stderr).trim();
  return text || "(no plan)";
}

function getRepoPlanIndexPath(repoId: string): string {
  return path.join(getRepoPlansMetaDir(repoId), "index.json");
}

function getWorkerPlanMetaPath(repoId: string, id: string): string {
  return path.join(getRepoPlansMetaDir(repoId), `${id}${JSON_EXT}`);
}

function filterAvailablePlans(
  plans: Array<WorkerPlan | undefined>,
): WorkerPlan[] {
  return plans.filter(
    (plan): plan is WorkerPlan => plan !== undefined && plan.available,
  );
}

function sortRecent<T extends { updatedAt: number }>(items: T[]): T[] {
  return items.sort((left, right) => right.updatedAt - left.updatedAt);
}

function isWorkerPlanMeta(value: unknown): value is WorkerPlanMeta {
  return (
    isArtifactMetaBase(value) &&
    isRecord(value) &&
    hasNumber(value, "updatedAt") &&
    typeof value.planPath === "string"
  );
}
