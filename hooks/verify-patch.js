#!/usr/bin/env node
// SessionStart hook: verify that the companion VSCode extension
// `claude-auto-plan-mode-ui` has its in-window patch applied to the current
// Anthropic Claude Code extension bundle. Logs a one-line warning to stdout
// if missing so the user can re-apply manually.
//
// Why this exists: the UI extension has three layers of auto-recovery
// (autoApplyOnActivation, watchBundleForOverwrites, watchForAnthropicUpdates)
// but they all depend on VSCode's extension lifecycle. When Anthropic ships a
// new extension version-mappe while VSCode is running, `fs.watch` on the old
// path silently dies and `onDidChange` events can race against our listener
// registration. This CLI-side check is decoupled from that lifecycle and
// fires reliably at every Claude Code session start.
//
// Fails open — any error path exits 0 with no output.

"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

const WEBVIEW_MARKER = 'label:"Auto plan mode"';
const HOST_MARKER = "claudeAutoPlanMode.activateTools";

function findAnthropicExtensionDir() {
  const extRoot = path.join(os.homedir(), ".vscode", "extensions");
  let entries;
  try {
    entries = fs.readdirSync(extRoot);
  } catch {
    return null;
  }
  const candidates = entries
    .filter((d) => d.startsWith("anthropic.claude-code-"))
    .map((d) => {
      const full = path.join(extRoot, d);
      let mtime = 0;
      try {
        mtime = fs.statSync(full).mtimeMs;
      } catch {}
      return { dir: full, mtime };
    })
    .sort((a, b) => b.mtime - a.mtime);
  return candidates[0]?.dir ?? null;
}

function fileContains(filePath, marker) {
  try {
    return fs.readFileSync(filePath, "utf8").includes(marker);
  } catch {
    return false;
  }
}

function main() {
  const extDir = findAnthropicExtensionDir();
  if (!extDir) return;

  const extJs = path.join(extDir, "extension.js");
  const webviewJs = path.join(extDir, "webview", "index.js");

  if (!fs.existsSync(extJs) || !fs.existsSync(webviewJs)) return;

  const hostOk = fileContains(extJs, HOST_MARKER);
  const webviewOk = fileContains(webviewJs, WEBVIEW_MARKER);

  if (hostOk && webviewOk) return;

  const missing = [];
  if (!webviewOk) missing.push("webview/index.js");
  if (!hostOk) missing.push("extension.js");

  const version = path.basename(extDir).replace("anthropic.claude-code-", "");
  console.log(
    `Auto plan mode patch missing from Anthropic ${version} (${missing.join(", ")}). ` +
      `Ctrl+Shift+P -> "Claude Auto Plan Mode: Re-apply In-Window Patch" to restore.`
  );
}

try {
  main();
} catch {
  // fail open
}
