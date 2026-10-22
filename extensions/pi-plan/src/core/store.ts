import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  realpath,
  rename,
  unlink,
  writeFile,
  link,
} from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { promisify } from "node:util";

export type PlanStatus = "active" | "done";
type PlanLocation = PlanStatus | "trash";
export interface PlanMetadata {
  id: string;
  title: string;
  projectPath: string;
  createdAt: string;
  updatedAt: string;
}
export interface Plan extends PlanMetadata {
  status: PlanStatus;
  path: string;
  body: string;
  source: string;
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const execFileAsync = promisify(execFile);

export async function resolveProject(cwd: string): Promise<string> {
  let root = cwd;
  try {
    const result = await execFileAsync("git", [
      "-C",
      cwd,
      "rev-parse",
      "--show-toplevel",
    ]);
    root = result.stdout.trim();
  } catch {
    // Non-Git directories use the directory where Pi was started.
  }
  return realpath(root);
}

export function serializePlan(metadata: PlanMetadata, body: string): string {
  return `---\n${Object.entries(metadata)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join("\n")}\n---\n\n${body.trim()}\n`;
}

export function parsePlan(source: string): {
  metadata: PlanMetadata;
  body: string;
} {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(source);
  if (!match) throw new Error("Missing plan metadata");
  const fields: Record<string, unknown> = {};
  for (const line of match[1]!.split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator < 0) throw new Error("Invalid plan metadata");
    fields[line.slice(0, separator)] = JSON.parse(line.slice(separator + 1));
  }
  const { id, title, projectPath, createdAt, updatedAt } = fields;
  if (
    typeof id !== "string" ||
    !UUID.test(id) ||
    typeof title !== "string" ||
    !title.trim() ||
    typeof projectPath !== "string" ||
    typeof createdAt !== "string" ||
    typeof updatedAt !== "string"
  ) {
    throw new Error("Invalid plan metadata");
  }
  return {
    metadata: { id, title, projectPath, createdAt, updatedAt },
    body: match[2]!.trim(),
  };
}

export class PlanStore {
  constructor(private readonly root = join(homedir(), ".pi", "plans")) {}

  private directory(projectPath: string, location: PlanLocation): string {
    return join(this.root, basename(projectPath) || "project", location);
  }

  async list(projectPath: string, status: PlanStatus): Promise<Plan[]> {
    const directory = this.directory(projectPath, status);
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (hasCode(error, "ENOENT")) return [];
      throw error;
    }
    const plans: Plan[] = [];
    for (const entry of entries) {
      if (
        !entry.isFile() ||
        !entry.name.endsWith(".md") ||
        !UUID.test(entry.name.slice(0, -3))
      )
        continue;
      const path = join(directory, entry.name);
      let source;
      try {
        source = await readFile(path, "utf8");
      } catch (error) {
        if (hasCode(error, "ENOENT")) continue;
        throw error;
      }
      try {
        const { metadata, body } = parsePlan(source);
        if (
          metadata.projectPath === projectPath &&
          entry.name === `${metadata.id}.md`
        ) {
          plans.push({ ...metadata, body, source, status, path });
        }
      } catch {
        throw new Error(
          `Invalid plan document: ${path}. Repair its metadata before browsing.`,
        );
      }
    }
    return plans.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async create(
    projectPath: string,
    title: string,
    body: string,
  ): Promise<Plan> {
    const now = new Date().toISOString();
    const metadata: PlanMetadata = {
      id: randomUUID(),
      title,
      projectPath,
      createdAt: now,
      updatedAt: now,
    };
    const directory = this.directory(projectPath, "active");
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const path = join(directory, `${metadata.id}.md`);
    const source = serializePlan(metadata, body);
    await writeFile(path, source, { flag: "wx", mode: 0o600 });
    return { ...metadata, body: body.trim(), source, path, status: "active" };
  }

  async revise(plan: Plan, title: string, body: string): Promise<void> {
    const { id, projectPath, createdAt } = plan;
    const source = serializePlan(
      {
        id,
        projectPath,
        createdAt,
        title,
        updatedAt: new Date().toISOString(),
      },
      body,
    );
    const temporary = `${plan.path}.${randomUUID()}.tmp`;
    await writeFile(temporary, source, { flag: "wx", mode: 0o600 });
    try {
      if ((await readFile(plan.path, "utf8")) !== plan.source) {
        throw new Error(
          "Plan changed while generating. Nothing overwritten; run /plan:edit again.",
        );
      }
      await rename(temporary, plan.path);
    } finally {
      await unlink(temporary).catch((error: unknown) => {
        if (!hasCode(error, "ENOENT")) throw error;
      });
    }
  }

  async move(plan: Plan, destination: PlanLocation): Promise<void> {
    if (destination === plan.status) return;
    const directory = this.directory(plan.projectPath, destination);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const target = join(directory, `${plan.id}.md`);
    // A hard link refuses to overwrite an existing destination, unlike rename.
    await link(plan.path, target);
    try {
      await unlink(plan.path);
    } catch (error) {
      await unlink(target);
      throw error;
    }
  }
}

function hasCode(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}
