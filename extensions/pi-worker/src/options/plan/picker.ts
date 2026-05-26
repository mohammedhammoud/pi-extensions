import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import {
  formatWorkerPlanDescription,
  getWorkerPlanDisplayName,
} from "../../artifacts/plans/labels";
import {
  getDefaultPlanPickerShortlist,
  listAllWorkerPlans,
  listWorkerPlans,
  type WorkerPlan,
} from "../../artifacts/plans/store";
import { dedupeArtifacts } from "../../core/storage/artifact-index";
import {
  openSearchSelect,
  type SearchSelectOption,
} from "../panel/search-select";
import { previewWorkerPlan } from "./preview";

const NO_PLAN_VALUE = "__none__";
const PREVIEW_ACTION = "preview";
const SELECT_ACTION = "select";
const BACK_ACTION = "back";

export async function selectWorkerPlan(
  ctx: ExtensionContext,
): Promise<WorkerPlan | null | undefined> {
  const repoPlans = await listWorkerPlans(ctx.cwd);
  const allPlans = await listAllWorkerPlans(0);
  const shortlist = getDefaultPlanPickerShortlist(repoPlans, allPlans);
  const plans = dedupeArtifacts([...repoPlans, ...allPlans]);

  while (true) {
    const selected = await openSearchSelect(
      ctx,
      "worker plan",
      [createNoneOption(), ...plans.map(toOption)],
      { defaultItems: [createNoneOption(), ...shortlist.map(toOption)] },
    );

    if (selected === undefined) return undefined;
    if (selected === NO_PLAN_VALUE) return null;

    const plan = plans.find((item) => item.id === selected);
    if (!plan) continue;

    const action = await openSearchSelect(ctx, getWorkerPlanDisplayName(plan), [
      createActionOption(SELECT_ACTION, "Select", "Use this plan"),
      createActionOption(
        PREVIEW_ACTION,
        "Preview",
        formatWorkerPlanDescription(plan),
      ),
      createActionOption(BACK_ACTION, "Back", "Return to plan list"),
    ]);

    if (action === undefined || action === BACK_ACTION) continue;
    if (action === SELECT_ACTION) return plan;
    if (action === PREVIEW_ACTION) {
      await previewWorkerPlan(ctx, plan);
    }
  }
}

function createNoneOption(): SearchSelectOption {
  return {
    value: NO_PLAN_VALUE,
    label: "-",
    description: "No plan",
    searchText: "none blank clear",
  };
}

function createActionOption(
  value: string,
  label: string,
  description: string,
): SearchSelectOption {
  return { value, label, description, searchText: `${label} ${description}` };
}

function toOption(plan: WorkerPlan): SearchSelectOption {
  return {
    value: plan.id,
    label: getWorkerPlanDisplayName(plan),
    description: formatWorkerPlanDescription(plan),
    searchText: [
      plan.promptPreview,
      plan.friendlyName,
      plan.repoName,
      plan.modelKey,
      plan.path,
    ]
      .filter(Boolean)
      .join(" "),
  };
}
