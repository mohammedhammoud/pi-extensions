import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { formatTimestamp } from "../../shared/format";

const REPOS_DIR = "repos";
const INDEX_DIR = "index";

export interface RepoInfo {
  id: string;
  rootPath: string;
  name: string;
}

export async function ensureWorkerStorageLayout(): Promise<void> {
  const rootDir = getWorkerRootDir();
  const reposDir = getReposRootDir();
  await mkdir(rootDir, { recursive: true });
  await mkdir(reposDir, { recursive: true });
  await mkdir(getIndexDir(), { recursive: true });
}

export function resolveRepoInfo(cwd: string): RepoInfo {
  const rootPath = resolveRepoRoot(cwd);
  const remote = resolveGitRemote(rootPath);
  const identity = remote || normalizePath(rootPath);
  return {
    id: createStableId(identity),
    rootPath,
    name: path.basename(rootPath),
  };
}

export function createArtifactId(
  repoId: string,
  modelKey: string,
  prompt: string,
  fallback: string,
): string {
  const timestamp = formatTimestamp(new Date());
  const promptSlug = slugify(prompt).slice(0, 40);
  const suffix = createStableId(
    `${repoId}:${modelKey}:${prompt}:${Date.now()}`,
  ).slice(0, 10);
  return `${timestamp}-${promptSlug || fallback}-${suffix}`;
}

function getWorkerRootDir(): string {
  return path.join(os.homedir(), ".pi", "worker");
}

function getReposRootDir(): string {
  return path.join(getWorkerRootDir(), REPOS_DIR);
}

function getRepoDir(repoId: string): string {
  return path.join(getReposRootDir(), repoId);
}

export function getRepoOutputsDir(repoId: string): string {
  return path.join(getRepoDir(repoId), "outputs");
}

export function getRepoOutputsMetaDir(repoId: string): string {
  return path.join(getRepoDir(repoId), "outputs-meta");
}

export function getRepoPlansDir(repoId: string): string {
  return path.join(getRepoDir(repoId), "plans");
}

export function getRepoPlansMetaDir(repoId: string): string {
  return path.join(getRepoDir(repoId), "plans-meta");
}

function getIndexDir(): string {
  return path.join(getWorkerRootDir(), INDEX_DIR);
}

export function getWorkerSettingsPath(): string {
  return path.join(getWorkerRootDir(), "settings.json");
}

export function getOutputIndexPath(): string {
  return path.join(getIndexDir(), "outputs.json");
}

export function getPlanIndexPath(): string {
  return path.join(getIndexDir(), "plans.json");
}

export async function readJson<T>(
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

export async function writeJsonAtomic(
  filePath: string,
  value: unknown,
): Promise<void> {
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(tempPath, JSON.stringify(value), "utf8");
  await rename(tempPath, filePath);
}

export async function exists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

export function prependUnique<T>(
  items: T[],
  next: T,
  matches: (item: T) => boolean,
): T[] {
  return [next, ...items.filter((item) => !matches(item))];
}

function createStableId(value: string): string {
  return crypto.createHash("sha1").update(value).digest("hex").slice(0, 16);
}

export function toTildePath(value: string): string {
  const home = os.homedir();
  return value.startsWith(home) ? `~${value.slice(home.length)}` : value;
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

function normalizePath(value: string): string {
  return path.resolve(value);
}

function slugify(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}
