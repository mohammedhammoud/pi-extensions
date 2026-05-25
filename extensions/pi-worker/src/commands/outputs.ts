import type {
  ExtensionAPI,
  ExtensionCommandContext,
} from "@earendil-works/pi-coding-agent";
import { formatWorkerOutputList, listWorkerOutputs } from "../core/output";
import { createWorkerListMessage } from "../ui/report";

export async function handleWorkerOutputs(
  pi: ExtensionAPI,
  action: "run" | "outputs" | "refine",
  ctx: ExtensionCommandContext,
): Promise<boolean> {
  if (action !== "outputs") return false;
  const outputs = await listWorkerOutputs(ctx.cwd);
  pi.sendMessage(createWorkerListMessage(formatWorkerOutputList(outputs)));
  return true;
}
