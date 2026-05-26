import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { WorkerResult } from "../../worker/types";
import {
  FRIENDLY_NAME_LIMIT,
  JSON_EXT,
  MAX_LIST_ITEMS,
  PROMPT_PREVIEW_LIMIT,
  STORE_VERSION,
  isArtifactMetaBase,
  readArtifactIds,
  updateArtifactIndexes,
} from "../../core/storage/artifact-index";
import {
  createFriendlyName,
  formatRelativePath,
  truncateInline,
} from "../../shared/format";
import { hasOptionalString, isRecord } from "../../shared/guards";
import { isWorkerMode, type WorkerMode } from "../../core/mode/definition";
import {
  createArtifactId,
  ensureWorkerStorageLayout,
  exists,
  getOutputIndexPath,
  getRepoOutputsDir,
  getRepoOutputsMetaDir,
  readJson,
  resolveRepoInfo,
  toTildePath,
  writeJsonAtomic,
} from "../../core/storage/layout";

const OUTPUT_FILE_EXT = ".md";
const MS_PER_SECOND = 1000;

type WorkerSourceType = "new-task" | "plan";

export interface WorkerOutput {
  id: string;
  path: string;
  relativePath: string;
  createdAt: number;
  updatedAt: number;
  repoId: string;
  repoName: string;
  modelKey: string;
  mode: WorkerMode;
  status: WorkerResult["status"] | "cancelled";
  promptPreview: string;
  sourceType: WorkerSourceType;
  planPath?: string;
  friendlyName?: string;
  available: boolean;
}

interface WorkerOutputMeta {
  version: 1;
  id: string;
  friendlyName?: string;
  repoId: string;
  repoPath: string;
  repoName: string;
  createdAt: number;
  updatedAt: number;
  modelKey: string;
  mode: WorkerMode;
  status: WorkerResult["status"] | "cancelled";
  promptPreview: string;
  outputPath: string;
  sourceType: WorkerSourceType;
  planPath?: string;
}

export async function saveWorkerOutput(
  cwd: string,
  modelKey: string,
  mode: WorkerMode,
  prompt: string,
  result: WorkerResult,
  planPath?: string,
  displayPrompt = prompt,
): Promise<WorkerOutput> {
  await ensureWorkerStorageLayout();

  const repo = resolveRepoInfo(cwd);
  const id = createArtifactId(repo.id, modelKey, prompt, "worker");
  const createdAt = Date.now();
  const outputPath = path.join(
    getRepoOutputsDir(repo.id),
    `${id}${OUTPUT_FILE_EXT}`,
  );
  const metaPath = getWorkerOutputMetaPath(repo.id, id);
  const content = buildOutputContent(
    modelKey,
    prompt,
    mode,
    result,
    outputPath,
    planPath,
  );

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, content, "utf8");

  const meta: WorkerOutputMeta = {
    version: STORE_VERSION,
    id,
    friendlyName: createFriendlyName(
      displayPrompt,
      createdAt,
      FRIENDLY_NAME_LIMIT,
      "Output",
    ),
    repoId: repo.id,
    repoPath: repo.rootPath,
    repoName: repo.name,
    createdAt,
    updatedAt: createdAt,
    modelKey,
    mode,
    status: result.status,
    promptPreview: truncateInline(displayPrompt, PROMPT_PREVIEW_LIMIT),
    outputPath,
    sourceType: getSourceType(planPath),
    ...(planPath ? { planPath } : {}),
  };

  await writeJsonAtomic(metaPath, meta);
  await updateArtifactIndexes(
    getOutputIndexPath(),
    getRepoOutputIndexPath(meta.repoId),
    meta.repoId,
    meta.id,
  );

  return toWorkerOutput(meta, true, cwd);
}

export async function listWorkerOutputs(cwd: string): Promise<WorkerOutput[]> {
  await ensureWorkerStorageLayout();

  const repo = resolveRepoInfo(cwd);
  const ids = await readArtifactIds(getRepoOutputIndexPath(repo.id));
  if (!ids) return [];

  const outputs = await Promise.all(
    ids.map(async (id) => await readWorkerOutputMeta(repo.id, id, cwd)),
  );
  return sortRecent(
    outputs.filter((output): output is WorkerOutput => output !== undefined),
  ).slice(0, MAX_LIST_ITEMS);
}

export function formatWorkerOutputLabel(output: WorkerOutput): string {
  const title = output.friendlyName || path.basename(output.path);
  return `${title} · ${output.repoName} · ${output.modelKey} · ${output.mode} · ${output.status}`;
}

async function readWorkerOutputMeta(
  repoId: string,
  id: string,
  cwd?: string,
): Promise<WorkerOutput | undefined> {
  const raw = await readJson(
    getWorkerOutputMetaPath(repoId, id),
    isWorkerOutputMeta,
  );
  if (!raw) return undefined;

  const available = await exists(raw.outputPath);
  return toWorkerOutput(raw, available, cwd);
}

function toWorkerOutput(
  meta: WorkerOutputMeta,
  available: boolean,
  cwd?: string,
): WorkerOutput {
  return {
    id: meta.id,
    path: meta.outputPath,
    relativePath: cwd
      ? formatRelativePath(cwd, meta.outputPath)
      : meta.outputPath,
    createdAt: meta.createdAt,
    updatedAt: meta.updatedAt,
    repoId: meta.repoId,
    repoName: meta.repoName,
    modelKey: meta.modelKey,
    mode: meta.mode,
    status: meta.status,
    promptPreview: meta.promptPreview,
    sourceType: meta.sourceType,
    ...(meta.planPath ? { planPath: meta.planPath } : {}),
    ...(meta.friendlyName ? { friendlyName: meta.friendlyName } : {}),
    available,
  };
}

function buildOutputContent(
  modelKey: string,
  prompt: string,
  mode: WorkerMode,
  result: WorkerResult,
  outputPath: string,
  planPath?: string,
): string {
  const output = result.assistantText || result.stdout || "(no output)";
  const trimmedStderr = result.stderr.trim();

  return [
    "# Worker Output",
    "",
    `Output: ${toTildePath(outputPath)}`,
    `Model: ${modelKey}`,
    `Mode: ${mode}`,
    planPath ? `Plan: ${toTildePath(planPath)}` : undefined,
    `Status: ${result.status}`,
    `Duration: ${(result.durationMs / MS_PER_SECOND).toFixed(1)}s`,
    result.code !== null ? `Exit code: ${result.code}` : undefined,
    "",
    "## Prompt",
    "",
    prompt,
    "",
    "## Output",
    "",
    output,
    trimmedStderr ? "" : undefined,
    trimmedStderr ? "## Stderr" : undefined,
    trimmedStderr ? "" : undefined,
    trimmedStderr || undefined,
  ]
    .filter(Boolean)
    .join("\n");
}

function getSourceType(planPath?: string): WorkerSourceType {
  return planPath ? "plan" : "new-task";
}

function getRepoOutputIndexPath(repoId: string): string {
  return path.join(getRepoOutputsMetaDir(repoId), "index.json");
}

function getWorkerOutputMetaPath(repoId: string, id: string): string {
  return path.join(getRepoOutputsMetaDir(repoId), `${id}${JSON_EXT}`);
}

function sortRecent<T extends { updatedAt: number }>(items: T[]): T[] {
  return items.sort((left, right) => right.updatedAt - left.updatedAt);
}

function isWorkerOutputMeta(value: unknown): value is WorkerOutputMeta {
  return (
    isArtifactMetaBase(value) &&
    isRecord(value) &&
    isWorkerMode(value.mode) &&
    isWorkerStatus(value.status) &&
    typeof value.outputPath === "string" &&
    isSourceType(value.sourceType) &&
    hasOptionalString(value, "planPath")
  );
}

function isWorkerStatus(value: unknown): value is WorkerOutputMeta["status"] {
  return value === "success" || value === "error" || value === "cancelled";
}

function isSourceType(value: unknown): value is WorkerSourceType {
  return value === "new-task" || value === "plan";
}
