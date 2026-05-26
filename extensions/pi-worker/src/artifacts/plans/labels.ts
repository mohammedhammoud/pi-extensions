import path from "node:path";
import type { WorkerPlan } from "./store";
import { FRIENDLY_NAME_LIMIT } from "../../core/storage/artifact-index";
import { formatDateTime, truncateInline } from "../../shared/format";

const PLAN_FILE_EXT = ".md";

export function formatWorkerPlanDescription(plan: WorkerPlan): string {
  return `${plan.repoName} · ${plan.modelKey} · ${formatDateTime(plan.updatedAt)}`;
}

export function getWorkerPlanDisplayName(plan: WorkerPlan): string {
  return (
    plan.friendlyName ||
    truncateInline(plan.promptPreview, FRIENDLY_NAME_LIMIT) ||
    humanizePlanId(path.basename(plan.path, PLAN_FILE_EXT))
  );
}

function humanizePlanId(value: string): string {
  const withoutTimestamp = value.replace(/^\d{8}-\d{6}-/, "");
  const withoutSuffix = withoutTimestamp.replace(/-[a-f0-9]{10}$/i, "");
  const words = withoutSuffix
    .split("-")
    .filter(Boolean)
    .map((part) => (part.length === 1 ? part.toUpperCase() : part));
  return words.join(" ") || "Plan";
}
