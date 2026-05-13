#!/usr/bin/env node
// PreToolUse hook: while plan mode is active and the auto-plan-tools flag is
// set, emit a permissionDecision=allow response so tool calls skip the
// approval dialog. ExitPlanMode is intentionally excluded — Anthropic
// special-cases that dialog and hook output does not bypass it.
// Fails open: any error path exits 0 with empty stdout.

"use strict";

const fs = require("fs");
const flagStore = require("./lib/flag-store.js");

const MAX_STDIN = 1024 * 1024;

function readStdin() {
  return new Promise((resolve) => {
    let raw = "";
    let resolved = false;
    const finish = () => {
      if (resolved) return;
      resolved = true;
      resolve(raw);
    };
    try {
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (chunk) => {
        if (raw.length < MAX_STDIN) {
          raw += chunk.substring(0, MAX_STDIN - raw.length);
        }
      });
      process.stdin.on("end", finish);
      process.stdin.on("error", finish);
    } catch {
      finish();
    }
  });
}

function emit(obj) {
  try {
    process.stdout.write(JSON.stringify(obj));
  } catch {
    // ignore
  }
}

async function main() {
  let raw = "";
  try {
    raw = await readStdin();
  } catch {
    return;
  }

  if (!raw) return;

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return;
  }

  if (!payload || typeof payload !== "object") return;

  const toolName = payload.tool_name;
  const permissionMode = payload.permission_mode;

  if (permissionMode !== "plan") return;

  // ExitPlanMode is rendered via its own UI flow that does not consult
  // hookSpecificOutput; let it fall through to the normal accept dialog.
  if (toolName === "ExitPlanMode") return;

  if (flagStore.isToolsActive()) {
    emit({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "allow",
      },
    });
  }
}

(async () => {
  try {
    await main();
  } catch {
    // fail open
  }
})();
