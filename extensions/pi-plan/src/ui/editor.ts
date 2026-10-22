import { spawn } from "node:child_process";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

export async function openPlanEditor(
  ctx: ExtensionContext,
  path: string,
): Promise<void> {
  const command = process.env.VISUAL?.trim() || process.env.EDITOR?.trim();
  if (!command)
    throw new Error(
      "No editor configured. Set VISUAL or EDITOR (for example, EDITOR='code --wait').",
    );
  // Pass the filename separately, never interpolate it into the configured shell command.
  const result = await ctx.ui.custom<number | Error | null>(
    async (tui, _theme, _kb, done) => {
      tui.stop();
      try {
        const status = await new Promise<number | null>((resolve, reject) => {
          const child =
            process.platform === "win32"
              ? spawn(`${command} "%PI_PLAN_FILE%"`, {
                  stdio: "inherit",
                  shell: true,
                  env: { ...process.env, PI_PLAN_FILE: path },
                })
              : spawn(
                  process.env.SHELL || "/bin/sh",
                  ["-c", `${command} "$1"`, "pi-plan", path],
                  { stdio: "inherit" },
                );
          child.once("error", reject);
          child.once("close", resolve);
        });
        done(status);
      } catch (error) {
        done(error instanceof Error ? error : new Error(String(error)));
      } finally {
        tui.start();
        tui.requestRender(true);
      }
      return { render: () => [], invalidate: () => {} };
    },
  );
  if (result instanceof Error) throw result;
  if (result !== 0)
    throw new Error(
      `Editor exited with ${result ?? "a signal"}. The plan remains on disk.`,
    );
}
