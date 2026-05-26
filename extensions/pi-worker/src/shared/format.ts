import path from "node:path";

const TIMESTAMP_PAD_LENGTH = 2;

export function truncateInline(value: string, limit: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  return normalized.length > limit
    ? `${normalized.slice(0, limit)}...`
    : normalized;
}

export function formatTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());
  const seconds = pad2(date.getSeconds());
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

export function formatDateTime(value: number): string {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function formatRelativePath(cwd: string, targetPath: string): string {
  const relativePath = path.relative(cwd, targetPath);
  return relativePath && !relativePath.startsWith("../")
    ? relativePath
    : targetPath;
}

export function createFriendlyName(
  prompt: string,
  createdAt: number,
  limit: number,
  fallback: string,
): string {
  const summary = truncateInline(prompt, limit);
  return summary || `${fallback} · ${formatDateTime(createdAt)}`;
}

function pad2(value: number): string {
  return String(value).padStart(TIMESTAMP_PAD_LENGTH, "0");
}
