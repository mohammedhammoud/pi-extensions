import type {
  ExtensionAPI,
  ExtensionCommandContext,
} from "@earendil-works/pi-coding-agent";
import { generatePlan } from "../core/generate";
import { loadPlanForExecution } from "../core/execution";
import { PlanStore, resolveProject, type Plan } from "../core/store";
import { openPlanEditor } from "../ui/editor";
import { pickPlan, selectStatus } from "../ui/picker";
import { previewPlan } from "../ui/preview";

export function registerPlanCommands(pi: ExtensionAPI): void {
  const store = new PlanStore();
  let active: AbortController | undefined;
  pi.on("session_shutdown", () => active?.abort());

  const register = (
    name: string,
    description: string,
    handler: (
      args: string,
      ctx: ExtensionCommandContext,
      projectPath: string,
      signal: AbortSignal,
    ) => Promise<void>,
  ): void => {
    pi.registerCommand(name, {
      description,
      handler: async (args, ctx) => {
        // Pi 0.75 exposes hasUI; custom terminal components are unavailable in RPC.
        if (!ctx.hasUI) {
          ctx.ui.notify(
            "Plan commands require interactive terminal mode.",
            "error",
          );
          return;
        }
        if (active || !ctx.isIdle()) {
          ctx.ui.notify("Wait for the current operation to finish.", "warning");
          return;
        }
        const controller = new AbortController();
        active = controller;
        try {
          await handler(
            args.trim(),
            ctx,
            await resolveProject(ctx.cwd),
            controller.signal,
          );
        } catch (error) {
          if (!controller.signal.aborted)
            ctx.ui.notify(
              error instanceof Error ? error.message : String(error),
              "error",
            );
        } finally {
          active = undefined;
        }
      },
    });
  };

  const choosePlan = async (
    ctx: ExtensionCommandContext,
    projectPath: string,
  ): Promise<Plan | undefined> => {
    while (true) {
      const status = await selectStatus(ctx);
      if (!status) return undefined;
      const plans = await store.list(projectPath, status);
      if (!plans.length) {
        ctx.ui.notify(`No ${status} plans for this project.`, "info");
        continue;
      }
      const selected = await pickPlan(ctx, plans, status);
      if (selected) return selected.plan;
    }
  };

  register(
    "plan:new",
    "Create an Active project plan: /plan:new <prompt>",
    async (args, ctx, projectPath, signal) => {
      const prompt =
        args || (await ctx.ui.editor("What would you like to plan?"))?.trim();
      if (!prompt || signal.aborted) return;
      const generated = await generatePlan(
        ctx,
        projectPath,
        prompt,
        undefined,
        signal,
      );
      if (!generated || signal.aborted) return;
      const plan = await store.create(
        projectPath,
        generated.title,
        generated.body,
      );
      ctx.ui.notify(`Plan created: ${plan.title}\n${plan.path}`, "info");
    },
  );

  register(
    "plan:edit",
    "Revise a project plan: /plan:edit <prompt>",
    async (args, ctx, projectPath, signal) => {
      const plan = await choosePlan(ctx, projectPath);
      if (!plan || signal.aborted) return;
      const prompt =
        args ||
        (await ctx.ui.editor("What should change in this plan?"))?.trim();
      if (!prompt || signal.aborted) return;
      const generated = await generatePlan(
        ctx,
        projectPath,
        prompt,
        plan.body,
        signal,
      );
      if (!generated || signal.aborted) return;
      await store.revise(plan, generated.title, generated.body);
      ctx.ui.notify(`Plan updated: ${generated.title}`, "info");
    },
  );

  register(
    "plan:execute",
    "Choose an Active plan and load it into the editor for implementation",
    async (_args, ctx, projectPath, signal) => {
      const plans = await store.list(projectPath, "active");
      if (signal.aborted) return;
      if (!plans.length) {
        ctx.ui.notify("No active plans for this project.", "info");
        return;
      }
      const selected = await pickPlan(ctx, plans, "active");
      if (!selected || signal.aborted) return;
      await loadPlanForExecution(ctx.ui, selected.plan, signal);
    },
  );

  register(
    "plan:show",
    "Choose and preview a project plan (read-only)",
    async (_args, ctx, projectPath) => {
      const plan = await choosePlan(ctx, projectPath);
      if (plan) await previewPlan(ctx, plan);
    },
  );

  register(
    "plan:list",
    "Browse project plans; Enter editor, Tab status, X trash",
    async (_args, ctx, projectPath, signal) => {
      while (!signal.aborted) {
        const status = await selectStatus(ctx);
        if (!status) return;
        let selectedId: string | undefined;
        while (!signal.aborted) {
          const plans = await store.list(projectPath, status);
          if (!plans.length) {
            ctx.ui.notify(`No ${status} plans for this project.`, "info");
            break;
          }
          const selected = await pickPlan(ctx, plans, status, true, selectedId);
          if (!selected || signal.aborted) break;
          const { action, plan } = selected;
          selectedId = plan.id;
          if (action === "open") {
            const body = await openPlanEditor(ctx, plan);
            if (body === undefined || body === plan.body) continue;
            const title =
              /^# [^\S\r\n]*(.+)(?:\r?\n|$)/.exec(body)?.[1]?.trim() ||
              plan.title;
            await store.revise(plan, title, body);
            ctx.ui.notify(`Plan updated: ${title}`, "info");
          }
          if (action === "toggle") {
            const destination = status === "active" ? "done" : "active";
            await store.move(plan, destination);
            ctx.ui.notify(`${plan.title} → ${destination}`, "info");
          }
          if (
            action === "delete" &&
            (await ctx.ui.confirm(
              "Move plan to trash?",
              `“${plan.title}” will leave this list. Its Markdown file remains recoverable in this project's trash folder.`,
            ))
          ) {
            await store.move(plan, "trash");
            ctx.ui.notify(`${plan.title} → trash`, "info");
          }
        }
      }
    },
  );
}
