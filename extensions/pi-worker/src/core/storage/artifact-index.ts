import { prependUnique, readJson, writeJsonAtomic } from "./layout";
import {
  hasNumber,
  hasOptionalString,
  hasString,
  hasStringArray,
  isRecord,
} from "../../shared/guards";

export const STORE_VERSION = 1;
export const JSON_EXT = ".json";
export const MAX_LIST_ITEMS = 20;
export const DEFAULT_PICKER_SHORTLIST_ITEMS = 10;
export const PROMPT_PREVIEW_LIMIT = 160;
export const FRIENDLY_NAME_LIMIT = 72;

interface ArtifactIndexEntry {
  repoId: string;
  artifactId: string;
}

interface ArtifactIndex {
  version: 1;
  recentArtifacts: ArtifactIndexEntry[];
}

interface RepoArtifactIndex {
  version: 1;
  repoId: string;
  artifactIds: string[];
}

export interface ArtifactMetaBase {
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
}

export async function updateArtifactIndexes(
  globalIndexPath: string,
  repoIndexPath: string,
  repoId: string,
  artifactId: string,
): Promise<void> {
  const index = (await readArtifactIndex(globalIndexPath)) ?? {
    version: STORE_VERSION,
    recentArtifacts: [],
  };
  index.recentArtifacts = prependUnique(
    index.recentArtifacts,
    { repoId, artifactId },
    (item) => item.repoId === repoId && item.artifactId === artifactId,
  );
  await writeJsonAtomic(globalIndexPath, index);

  const repoIndex = (await readRepoArtifactIndex(repoIndexPath)) ?? {
    version: STORE_VERSION,
    repoId,
    artifactIds: [],
  };
  repoIndex.artifactIds = prependUnique(
    repoIndex.artifactIds,
    artifactId,
    (item) => item === artifactId,
  );
  await writeJsonAtomic(repoIndexPath, repoIndex);
}

export async function readArtifactIds(
  indexPath: string,
): Promise<string[] | undefined> {
  return (await readRepoArtifactIndex(indexPath))?.artifactIds;
}

export async function readRecentArtifactRefs(
  indexPath: string,
): Promise<ArtifactIndexEntry[] | undefined> {
  return (await readArtifactIndex(indexPath))?.recentArtifacts;
}

export function dedupeArtifacts<T extends { id: string }>(artifacts: T[]): T[] {
  const seen = new Set<string>();
  return artifacts.filter((artifact) => {
    if (seen.has(artifact.id)) return false;
    seen.add(artifact.id);
    return true;
  });
}

export function isArtifactMetaBase(value: unknown): value is ArtifactMetaBase {
  return (
    isRecord(value) &&
    value.version === STORE_VERSION &&
    hasString(value, "id") &&
    hasString(value, "repoId") &&
    hasString(value, "repoPath") &&
    hasString(value, "repoName") &&
    hasNumber(value, "createdAt") &&
    hasNumber(value, "updatedAt") &&
    hasString(value, "modelKey") &&
    hasString(value, "promptPreview") &&
    hasOptionalString(value, "friendlyName")
  );
}

function isArtifactIndex(value: unknown): value is ArtifactIndex {
  return (
    isRecord(value) &&
    value.version === STORE_VERSION &&
    Array.isArray(value.recentArtifacts) &&
    value.recentArtifacts.every(isArtifactIndexEntry)
  );
}

function isArtifactIndexEntry(value: unknown): value is ArtifactIndexEntry {
  return (
    isRecord(value) &&
    hasString(value, "repoId") &&
    hasString(value, "artifactId")
  );
}

function isRepoArtifactIndex(value: unknown): value is RepoArtifactIndex {
  return (
    isRecord(value) &&
    value.version === STORE_VERSION &&
    hasString(value, "repoId") &&
    hasStringArray(value, "artifactIds")
  );
}

async function readArtifactIndex(
  indexPath: string,
): Promise<ArtifactIndex | undefined> {
  return await readJson(indexPath, isArtifactIndex);
}

async function readRepoArtifactIndex(
  indexPath: string,
): Promise<RepoArtifactIndex | undefined> {
  return await readJson(indexPath, isRepoArtifactIndex);
}
