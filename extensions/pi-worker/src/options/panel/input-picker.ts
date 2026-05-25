import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import {
  formatWorkerOutputLabel,
  getDefaultOutputPickerShortlist,
  listAllWorkerOutputs,
  listWorkerOutputs,
  type WorkerOutput,
} from "../../core/output";
import { openSearchSelect, type SearchSelectOption } from "./search-select";

const NEW_INPUT_VALUE = "__new__";

export async function hasSavedWorkerOutputs(
  _ctx: ExtensionContext,
): Promise<boolean> {
  return (await listAllWorkerOutputs(1)).length > 0;
}

export async function selectWorkerInputOutput(
  ctx: ExtensionContext,
): Promise<WorkerOutput | null | undefined> {
  const repoOutputs = await listWorkerOutputs(ctx.cwd);
  const allOutputs = await listAllWorkerOutputs(0);
  const shortlist = getDefaultOutputPickerShortlist(repoOutputs, allOutputs);
  const outputs = dedupeOutputs([...repoOutputs, ...allOutputs]);

  const selected = await openSearchSelect(
    ctx,
    "worker input",
    [createNewOption(), ...outputs.map(toOption)],
    { defaultItems: [createNewOption(), ...shortlist.map(toOption)] },
  );

  if (selected === undefined) return undefined;
  if (selected === NEW_INPUT_VALUE) return null;
  return outputs.find((output) => output.id === selected);
}

function createNewOption(): SearchSelectOption {
  return {
    value: NEW_INPUT_VALUE,
    label: "-",
    searchText: "blank new empty",
  };
}

function toOption(output: WorkerOutput): SearchSelectOption {
  return {
    value: output.id,
    label: formatWorkerOutputLabel(output),
    searchText: [
      output.promptPreview,
      output.repoName,
      output.modelKey,
      output.mode,
      output.status,
      output.path,
    ].join(" "),
  };
}

function dedupeOutputs(outputs: WorkerOutput[]): WorkerOutput[] {
  const seen = new Set<string>();
  return outputs.filter((output) => {
    if (seen.has(output.id)) return false;
    seen.add(output.id);
    return true;
  });
}
