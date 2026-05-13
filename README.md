# claude-auto-plan-mode

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Claude Code Plugin](https://img.shields.io/badge/Claude%20Code-plugin-da7756)](https://code.claude.com/docs/en/plugins)

A Claude Code plugin that adds two new permission modes alongside the built-in Plan and Auto modes: **Auto plan mode** auto-approves tool calls while the session is in plan mode, and **Full auto plan mode** also auto-accepts the plan itself and transitions to Auto mode so you can walk away while Claude finishes the task.

Solves the gap where Claude pauses on every tool call (Bash, Read, MCP, Grep, etc.) during plan mode, breaking the "go grab coffee while it explores the codebase" workflow.

## What it does

Two modes, picked based on how much you trust the run:

| | **Auto plan mode** (Mode 1) | **Full auto plan mode** (Mode 2) |
| :--- | :--- | :--- |
| Tool calls during plan mode (Bash, Read, Grep, MCP, …) | Auto-approved | Auto-approved |
| `ExitPlanMode` ("Accept plan?") | **Manual approval still required** | Auto-approved |
| Permission mode after plan accepted | Stays in plan mode | **Transitions to Auto mode** |
| Edits / Writes / MultiEdits during plan | Still blocked (plan-mode invariant) | Still blocked (plan-mode invariant) |
| Flag files written | `~/.claude/auto-plan-tools` | `~/.claude/auto-plan-tools` + `~/.claude/auto-plan-full` |

Mode 1 is the safer default: Claude explores freely but you still review the plan before code changes happen. Mode 2 is for trusted, well-scoped tasks where you want true walk-away — the run completes end-to-end without you.

Selecting any other mode (Default, Plan, Accept edits, Auto, Bypass permissions) clears both flag files, so the auto-approve behavior is sticky to the mode and disappears when you switch off.

## Companion UI extension

The mode picker entries are provided by [claude-auto-plan-mode-ui](https://github.com/PettHa/claude-auto-plan-mode-ui), a small VSCode extension that patches the Claude Code webview to add the two new picker entries. The plugin works without the extension via the `/claude-auto-plan-mode:auto-plan-tools` and `/claude-auto-plan-mode:auto-plan-full` slash commands.

If you only use the plugin (no UI extension), Mode 2's "switch to Auto mode after plan acceptance" step depends on whether Claude Code honors the speculative `permissionMode` field in the hook response — see [docs/hook-response-format.md](docs/hook-response-format.md). With the UI extension installed, a file-watcher on `~/.claude/auto-plan-transition-to-auto` provides a reliable fallback.

## Install

Requires Claude Code with plugin support (`/plugin` command available).

```text
/plugin marketplace add PettHa/claude-auto-plan-mode
/plugin install claude-auto-plan-mode@claude-auto-plan-mode
```

Then reload the window (`Developer: Reload Window` or restart Claude Code) so the new PreToolUse hook is registered.

To test locally before installing from GitHub:

```bash
claude --plugin-dir /path/to/claude-auto-plan-mode
```

## Slash commands

| Command | Effect |
| :--- | :--- |
| `/claude-auto-plan-mode:auto-plan-status` | Report which flag files exist and which mode (if any) is active. |
| `/claude-auto-plan-mode:auto-plan-tools` | Activate Mode 1. Writes `auto-plan-tools`, deletes `auto-plan-full`. |
| `/claude-auto-plan-mode:auto-plan-full` | Activate Mode 2. Writes both flag files. |
| `/claude-auto-plan-mode:auto-plan-clear` | Panic off. Deletes both flag files plus any stale transition signal. |

## Architecture

```
claude-auto-plan-mode/
├── .claude-plugin/
│   ├── plugin.json            ← manifest
│   └── marketplace.json       ← marketplace entry
├── hooks/
│   ├── hooks.json             ← PreToolUse matcher: "*"
│   ├── auto-approve-during-plan.js  ← main hook
│   └── lib/
│       └── flag-store.js      ← flag-file helpers
├── commands/
│   ├── auto-plan-status.md
│   ├── auto-plan-clear.md
│   ├── auto-plan-tools.md
│   └── auto-plan-full.md
└── docs/
    └── hook-response-format.md
```

The `PreToolUse` hook fires on every tool call. It reads `tool_name` and `permission_mode` from stdin, checks the two flag files in `~/.claude/`, and emits a `hookSpecificOutput.permissionDecision = "allow"` JSON response to bypass the approval dialog when appropriate. Outside plan mode, or with no flags set, the hook is a fast no-op.

## How it works (technical)

The PreToolUse hook stdout JSON is the one documented in the Claude Code plugins reference:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow"
  }
}
```

`permissionDecision` accepts `"allow"`, `"deny"`, or `"ask"`. The plugin only ever emits `"allow"` (or nothing, which is equivalent to the default flow).

For Mode 2's "switch to Auto after plan accepted" transition, the hook emits two signals together so whichever mechanism Claude Code honors wins:

- **Variant A — hook output field.** Adds `permissionMode: "auto"` to the same `hookSpecificOutput` object. Speculative — see [docs/hook-response-format.md](docs/hook-response-format.md).
- **Variant B — signal file + UI extension.** Writes `~/.claude/auto-plan-transition-to-auto` with `{ at: timestamp }`. The companion VSCode extension watches that path with `fs.watch` and runs the VSCode command equivalent to "switch to Auto mode", then deletes the signal file.

Variant A is preferred if it works (zero round-trip, no UI extension needed). Variant B is the reliable fallback.

## Configuration

Flag-file paths (no environment variables — files are the entire interface):

| Path | Set by | Effect |
| :--- | :--- | :--- |
| `~/.claude/auto-plan-tools` | Mode 1 + Mode 2 | Auto-approve tool calls in plan mode. |
| `~/.claude/auto-plan-full` | Mode 2 only | Also auto-approve `ExitPlanMode` + emit Auto-mode transition. |
| `~/.claude/auto-plan-transition-to-auto` | Hook (Mode 2 only, on `ExitPlanMode`) | Signal for the UI extension's file-watcher. Self-clearing. |

Invariant: `auto-plan-full` never exists without `auto-plan-tools`. The activate helpers enforce this; if you edit the files by hand and break the invariant, the plugin still behaves correctly (Mode 2 logic short-circuits on `isFullActive()` which requires the file).

## License

MIT — see [LICENSE](LICENSE).
