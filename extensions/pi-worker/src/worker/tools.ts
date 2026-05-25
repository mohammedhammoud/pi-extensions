const COMMAND_PREVIEW_CHARS = 60;

/**
 * Build a short summary for a tool call when it starts.
 * Uses special formatting for common tools to keep the activity readable.
 */
export function summarizeToolStart(toolName: string, args: unknown): string {
  if (!args || typeof args !== "object") {
    return `run ${toolName}`;
  }

  const input = args as Record<string, unknown>;
  const summaries: Record<string, (value: Record<string, unknown>) => string> =
    {
      read: (value) => `read ${value.path}`,
      write: (value) => `write ${value.path}`,
      edit: (value) => `edit ${value.path}`,
      bash: (value) => `bash ${truncateCommand(String(value.command))}`,
      find: (value) => `find in ${value.path}`,
      grep: (value) => `grep ${value.pattern}`,
      ls: (value) => `list ${value.path}`,
    };

  const summary = summaries[toolName];
  return summary ? summary(input) : `run ${toolName}`;
}

export function truncateCommand(command: string): string {
  return command.length > COMMAND_PREVIEW_CHARS
    ? `${command.slice(0, COMMAND_PREVIEW_CHARS)}...`
    : command;
}
