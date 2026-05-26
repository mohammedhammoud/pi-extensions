import test from "node:test";
import assert from "node:assert/strict";
import {
  extractAssistantText,
  parseLifecycleEvent,
  parseStdoutLine,
} from "./events";

test("extractAssistantText joins text blocks", () => {
  assert.equal(extractAssistantText("raw"), "raw");
  assert.equal(
    extractAssistantText([
      { type: "text", text: "one" },
      { type: "text", text: "two" },
    ]),
    "one\ntwo",
  );
  assert.equal(extractAssistantText([{ type: "other", text: "x" }]), "");
});

test("parseLifecycleEvent maps worker lifecycle", () => {
  assert.deepEqual(parseLifecycleEvent({ type: "agent_start" }), {
    emit: { stdoutLine: "worker started" },
  });
  assert.deepEqual(parseLifecycleEvent({ type: "agent_end" }), {
    emit: { stdoutLine: "worker finished" },
  });
});

test("parseStdoutLine handles plain text and assistant deltas", () => {
  assert.deepEqual(parseStdoutLine("hello", ""), {
    emit: { stdoutLine: "hello" },
  });

  const delta = JSON.stringify({
    type: "message_update",
    assistantMessageEvent: { type: "text_delta", delta: "abc" },
  });
  assert.deepEqual(parseStdoutLine(delta, "x"), {
    nextAssistantText: "xabc",
    emit: {
      assistantText: "xabc",
      stdoutLine: "assistant writing",
    },
  });
});

test("parseStdoutLine handles assistant message end", () => {
  const end = JSON.stringify({
    type: "message_end",
    message: {
      role: "assistant",
      content: [{ type: "text", text: "done" }],
    },
  });
  assert.deepEqual(parseStdoutLine(end, "prev"), {
    nextAssistantText: "done",
    emit: {
      assistantText: "done",
      stdoutLine: "assistant finished",
    },
  });
});
