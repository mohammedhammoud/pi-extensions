const MAX_STDOUT_BUFFER_CHARS = 100_000;
const TRUNCATED_LINE_PREFIX = "[buffer overflow, truncated]";

export interface DrainResult {
  lines: string[];
  rest: string;
}

export interface GuardedDrainResult {
  lines: string[];
  rest: string;
  overflowWarning?: string;
}

/**
 * Drain newline-delimited lines from a buffer.
 * Returns complete lines plus the remaining incomplete tail.
 */
export function drainLineBuffer(buffer: string): DrainResult {
  const lines: string[] = [];
  let rest = buffer;

  while (true) {
    const newlineIndex = rest.indexOf("\n");
    if (newlineIndex === -1) {
      return { lines, rest };
    }
    lines.push(rest.slice(0, newlineIndex));
    rest = rest.slice(newlineIndex + 1);
  }
}

/**
 * Drain with a buffer guard. If the buffer exceeds MAX_STDOUT_BUFFER_CHARS,
 * return an overflow warning and reset the pending buffer.
 */
export function guardedDrainLineBuffer(buffer: string): GuardedDrainResult {
  if (buffer.length > MAX_STDOUT_BUFFER_CHARS) {
    return {
      lines: [],
      rest: "",
      overflowWarning: `${TRUNCATED_LINE_PREFIX} (${buffer.length} chars, flushed)`,
    };
  }

  const drained = drainLineBuffer(buffer);
  return { ...drained };
}
