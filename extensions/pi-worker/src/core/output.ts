import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { WorkerResult } from "../worker/types";
import type { WorkerMode } from "./state";

const STORE_VERSION = 1;
const OUTPUT_FILE_EXT = ".md";
const JSON_EXT = ".json";
const MS_PER_SECOND = 1000;
const TIMESTAMP_PAD_LENGTH = 2;
const DEFAULT_PREVIEW_CHARS = 1200;
const MAX_LIST_ITEMS = 20;
const DEFAULT_PICKER_SHORTLIST_ITEMS = 10;
const PROMPT_PREVIEW_LIMIT = 160;
const OUTPUTS_DIR = "outputs";
const META_DIR = "meta";
const REPOS_DIR = "repos";
const INDEX_FILE = "index.json";
const NO_OUTPUTS_MESSAGE = "No worker outputs yet.";
const OUTPUT_LIST_TITLE = "Worker outputs:";
const REFINE_USAGE_MESSAGE = "Use: /worker refine <path>";

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
  sourceType: "new-task" | "refine-output";
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
  lastUsedAt: number;
  sourceType: "new-task" | "refine-output";
}

interface WorkerIndex {
  version: 1;
  recentOutputIds: string[];
}

interface RepoIndex {
  version: 1;
  repoId: string;
  outputIds: string[];
}

interface RepoInfo {
  id: string;
  rootPath: string;
  name: string;
}

export async function saveWorkerOutput(
  cwd: string,
  modelKey: string,
  mode: WorkerMode,
  prompt: string,
  result: WorkerResult,
  sourceType: "new-task" | "refine-output",
): Promise<WorkerOutput> {
  const repo = resolveRepoInfo(cwd);
  const id = createOutputId(repo.id, modelKey, prompt);
  const outputPath = path.join(getOutputsDir(), `${id}${OUTPUT_FILE_EXT}`);
  const metaPath = path.join(getMetaDir(), `${id}${JSON_EXT}`);
  const createdAt = Date.now();
  const content = buildOutputContent(
    modelKey,
    prompt,
    mode,
    result,
    outputPath,
  );

  await mkdir(getOutputsDir(), { recursive: true });
  await mkdir(getMetaDir(), { recursive: true });
  await mkdir(getReposDir(), { recursive: true });

  await writeFile(outputPath, content, "utf8");

  const meta: WorkerOutputMeta = {
    version: STORE_VERSION,
    id,
    repoId: repo.id,
    repoPath: repo.rootPath,
    repoName: repo.name,
    createdAt,
    updatedAt: createdAt,
    modelKey,
    mode,
    status: result.status,
    promptPreview: truncateInline(prompt, PROMPT_PREVIEW_LIMIT),
    outputPath,
    lastUsedAt: createdAt,
    sourceType,
  };

  await writeJsonAtomic(metaPath, meta);
  await updateIndexes(meta);

  return toWorkerOutput(meta, true, cwd);
}

export async function listWorkerOutputs(cwd: string): Promise<WorkerOutput[]> {
  const repo = resolveRepoInfo(cwd);
  const repoIndex = await readRepoIndex(repo.id);
  if (!repoIndex) return [];

  const outputs = await Promise.all(
    repoIndex.outputIds.map(async (id) => await readWorkerOutputMeta(id, cwd)),
  );
  return outputs
    .filter((output): output is WorkerOutput => output !== undefined)
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .slice(0, MAX_LIST_ITEMS);
}

export async function listAllWorkerOutputs(
  limit = MAX_LIST_ITEMS,
): Promise<WorkerOutput[]> {
  const index = await readWorkerIndex();
  if (!index) return [];

  const outputIds =
    limit > 0
      ? index.recentOutputIds.slice(0, limit * 4)
      : index.recentOutputIds;
  const outputs = await Promise.all(
    outputIds.map(async (id) => await readWorkerOutputMeta(id)),
  );

  const resolvedOutputs = outputs
    .filter((output): output is WorkerOutput => output !== undefined)
    .sort((left, right) => right.updatedAt - left.updatedAt);

  return limit > 0 ? resolvedOutputs.slice(0, limit) : resolvedOutputs;
}

export async function resolveWorkerOutputPath(
  cwd: string,
  inputPath: string,
): Promise<WorkerOutput | undefined> {
  const trimmed = inputPath.trim();
  if (!trimmed) return undefined;

  const metaOutput = await readWorkerOutputMeta(trimmed, cwd);
  if (metaOutput) return metaOutput;

  const candidate = path.isAbsolute(trimmed)
    ? trimmed
    : path.resolve(cwd, trimmed);

  try {
    const info = await stat(candidate);
    if (!info.isFile()) return undefined;
    return {
      id: path.basename(candidate, path.extname(candidate)),
      path: candidate,
      relativePath: path.relative(cwd, candidate) || candidate,
      createdAt: info.mtimeMs,
      updatedAt: info.mtimeMs,
      repoId: createStableId(candidate),
      repoName: path.basename(cwd),
      modelKey: "unknown",
      mode: "task",
      status: "success",
      promptPreview: "",
      sourceType: "new-task",
      available: true,
    };
  } catch {
    return undefined;
  }
}

export async function readWorkerOutputPreview(
  outputPath: string,
  maxChars = DEFAULT_PREVIEW_CHARS,
): Promise<string> {
  const content = await readFile(outputPath, "utf8");
  return content.length > maxChars
    ? `${content.slice(0, maxChars)}...`
    : content;
}

export function buildReuseOutputPrompt(output: WorkerOutput): string {
  return `Use the existing worker output file at "${output.path}" as input.\n`;
}

export function formatWorkerOutputList(outputs: WorkerOutput[]): string {
  if (outputs.length === 0) {
    return NO_OUTPUTS_MESSAGE;
  }

  return [
    OUTPUT_LIST_TITLE,
    ...outputs.map(
      (output, index) => `${index + 1}. ${formatWorkerOutputLabel(output)}`,
    ),
    "",
    REFINE_USAGE_MESSAGE,
  ].join("\n");
}

export function formatWorkerOutputLabel(output: WorkerOutput): string {
  const title = output.friendlyName || path.basename(output.path);
  return `${title} · ${output.repoName} · ${output.modelKey} · ${output.mode} · ${output.status}`;
}

export function getDefaultOutputPickerShortlist(
  repoOutputs: WorkerOutput[],
  allOutputs: WorkerOutput[],
  limit = DEFAULT_PICKER_SHORTLIST_ITEMS,
): WorkerOutput[] {
  return dedupeOutputs([...repoOutputs, ...allOutputs]).slice(0, limit);
}

async function readWorkerOutputMeta(
  id: string,
  cwd?: string,
): Promise<WorkerOutput | undefined> {
  const metaPath = path.join(getMetaDir(), `${id}${JSON_EXT}`);

  try {
    const raw = JSON.parse(await readFile(metaPath, "utf8")) as unknown;
    if (!isWorkerOutputMeta(raw)) return undefined;
    const available = await exists(raw.outputPath);
    return toWorkerOutput(raw, available, cwd);
  } catch {
    return undefined;
  }
}

function dedupeOutputs(outputs: WorkerOutput[]): WorkerOutput[] {
  const seen = new Set<string>();
  return outputs.filter((output) => {
    if (seen.has(output.id)) return false;
    seen.add(output.id);
    return true;
  });
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
      ? path.relative(cwd, meta.outputPath) || meta.outputPath
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
    ...(meta.friendlyName ? { friendlyName: meta.friendlyName } : {}),
    available,
  };
}

async function updateIndexes(meta: WorkerOutputMeta): Promise<void> {
  const index = (await readWorkerIndex()) ?? {
    version: STORE_VERSION,
    recentOutputIds: [],
  };
  index.recentOutputIds = prependUnique(index.recentOutputIds, meta.id);
  await writeJsonAtomic(path.join(getWorkerRootDir(), INDEX_FILE), index);

  const repoPath = path.join(getReposDir(), `${meta.repoId}${JSON_EXT}`);
  const repoIndex = (await readRepoIndex(meta.repoId)) ?? {
    version: STORE_VERSION,
    repoId: meta.repoId,
    outputIds: [],
  };
  repoIndex.outputIds = prependUnique(repoIndex.outputIds, meta.id);
  await writeJsonAtomic(repoPath, repoIndex);
}

async function readWorkerIndex(): Promise<WorkerIndex | undefined> {
  return await readJson(
    path.join(getWorkerRootDir(), INDEX_FILE),
    isWorkerIndex,
  );
}

async function readRepoIndex(repoId: string): Promise<RepoIndex | undefined> {
  return await readJson(
    path.join(getReposDir(), `${repoId}${JSON_EXT}`),
    isRepoIndex,
  );
}

async function readJson<T>(
  filePath: string,
  guard: (value: unknown) => value is T,
): Promise<T | undefined> {
  try {
    const raw = JSON.parse(await readFile(filePath, "utf8")) as unknown;
    return guard(raw) ? raw : undefined;
  } catch {
    return undefined;
  }
}

async function writeJsonAtomic(
  filePath: string,
  value: unknown,
): Promise<void> {
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(tempPath, JSON.stringify(value), "utf8");
  await rename(tempPath, filePath);
}

function buildOutputContent(
  modelKey: string,
  prompt: string,
  mode: WorkerMode,
  result: WorkerResult,
  outputPath: string,
): string {
  const output = result.assistantText || result.stdout || "(no output)";
  const trimmedStderr = result.stderr.trim();

  return [
    "# Worker Output",
    "",
    `Output: ${toTildePath(outputPath)}`,
    `Model: ${modelKey}`,
    `Mode: ${mode}`,
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

function resolveRepoInfo(cwd: string): RepoInfo {
  const rootPath = resolveRepoRoot(cwd);
  const remote = resolveGitRemote(rootPath);
  const identity = remote || normalizePath(rootPath);
  return {
    id: createStableId(identity),
    rootPath,
    name: path.basename(rootPath),
  };
}

function resolveRepoRoot(cwd: string): string {
  try {
    return (
      execFileSync("git", ["rev-parse", "--show-toplevel"], {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim() || cwd
    );
  } catch {
    return cwd;
  }
}

function resolveGitRemote(cwd: string): string | undefined {
  try {
    const remote = execFileSync(
      "git",
      ["config", "--get", "remote.origin.url"],
      {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    ).trim();
    return remote || undefined;
  } catch {
    return undefined;
  }
}

function createOutputId(
  repoId: string,
  modelKey: string,
  prompt: string,
): string {
  const timestamp = formatTimestamp(new Date());
  const promptSlug = slugify(prompt).slice(0, 40);
  const suffix = createStableId(
    `${repoId}:${modelKey}:${prompt}:${Date.now()}`,
  ).slice(0, 10);
  return `${timestamp}-${promptSlug || "worker"}-${suffix}`;
}

function getWorkerRootDir(): string {
  return path.join(os.homedir(), ".pi", "worker");
}

function getOutputsDir(): string {
  return path.join(getWorkerRootDir(), OUTPUTS_DIR);
}

function getMetaDir(): string {
  return path.join(getWorkerRootDir(), META_DIR);
}

function getReposDir(): string {
  return path.join(getWorkerRootDir(), REPOS_DIR);
}

function normalizePath(value: string): string {
  return path.resolve(value);
}

function createStableId(value: string): string {
  return crypto.createHash("sha1").update(value).digest("hex").slice(0, 16);
}

function prependUnique(items: string[], next: string): string[] {
  return [next, ...items.filter((item) => item !== next)];
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

function toTildePath(value: string): string {
  const home = os.homedir();
  return value.startsWith(home) ? `~${value.slice(home.length)}` : value;
}

function formatTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());
  const seconds = pad2(date.getSeconds());
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

function pad2(value: number): string {
  return String(value).padStart(TIMESTAMP_PAD_LENGTH, "0");
}

function slugify(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function truncateInline(value: string, limit: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  return normalized.length > limit
    ? `${normalized.slice(0, limit)}...`
    : normalized;
}

function isWorkerIndex(value: unknown): value is WorkerIndex {
  return (
    isRecord(value) &&
    value.version === STORE_VERSION &&
    Array.isArray(value.recentOutputIds) &&
    value.recentOutputIds.every((item) => typeof item === "string")
  );
}

function isRepoIndex(value: unknown): value is RepoIndex {
  return (
    isRecord(value) &&
    value.version === STORE_VERSION &&
    typeof value.repoId === "string" &&
    Array.isArray(value.outputIds) &&
    value.outputIds.every((item) => typeof item === "string")
  );
}

function isWorkerOutputMeta(value: unknown): value is WorkerOutputMeta {
  return (
    isRecord(value) &&
    value.version === STORE_VERSION &&
    typeof value.id === "string" &&
    typeof value.repoId === "string" &&
    typeof value.repoPath === "string" &&
    typeof value.repoName === "string" &&
    typeof value.createdAt === "number" &&
    typeof value.updatedAt === "number" &&
    typeof value.modelKey === "string" &&
    isWorkerMode(value.mode) &&
    isWorkerStatus(value.status) &&
    typeof value.promptPreview === "string" &&
    typeof value.outputPath === "string" &&
    typeof value.lastUsedAt === "number" &&
    isSourceType(value.sourceType) &&
    (value.friendlyName === undefined || typeof value.friendlyName === "string")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isWorkerMode(value: unknown): value is WorkerMode {
  return (
    value === "task" ||
    value === "plan" ||
    value === "implement" ||
    value === "review"
  );
}

function isWorkerStatus(value: unknown): value is WorkerOutputMeta["status"] {
  return value === "success" || value === "error" || value === "cancelled";
}

function isSourceType(value: unknown): value is WorkerOutputMeta["sourceType"] {
  return value === "new-task" || value === "refine-output";
}
