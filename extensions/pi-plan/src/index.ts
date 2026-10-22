import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerPlanCommands } from "./commands/register";

export default function (pi: ExtensionAPI): void {
  registerPlanCommands(pi);
}
