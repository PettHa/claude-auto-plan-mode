# claude-auto-plan-mode

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Claude Code Plugin](https://img.shields.io/badge/Claude%20Code-plugin-da7756)](https://code.claude.com/docs/en/plugins)

A Claude Code plugin that adds an **Auto plan mode** to the permission-mode picker. While the session is in plan mode and the flag is set, tool calls during planning (Bash, Read, Grep, MCP, skills, Agent, WebFetch, …) auto-approve without a dialog. The "Accept this plan?" dialog at the end still appears — that's intentional, see [Why `ExitPlanMode` isn't auto-accepted](#why-exitplanmode-isnt-auto-accepted) below.

Solves the gap where Claude pauses on every tool call during plan mode, breaking the "go grab coffee while it explores the codebase" workflow.

## What it does

While `permission_mode === "plan"` AND `~/.claude/auto-plan-tools` flag is present:

| | Behavior |
| :--- | :--- |
| Tool calls during plan mode (Bash, Read, Grep, MCP, …) | Auto-approved |
| `ExitPlanMode` ("Accept this plan?") | Manual approval (Anthropic policy, see below) |
| Edits / Writes / MultiEdits during plan | Still blocked (plan-mode invariant) |
| Flag file written | `~/.claude/auto-plan-tools` |

Selecting any other mode (Default, Plan, Accept edits, Auto, Bypass permissions) clears the flag, so the auto-approve behavior is sticky to the mode and disappears when you switch off.

## Companion UI extension

The mode-picker entry is provided by [claude-auto-plan-mode-ui](https://github.com/PettHa/claude-auto-plan-mode-ui), a small VSCode extension that patches the Claude Code webview to add the entry and forwards the picker click to this plugin's commands. The plugin works without the extension via the `/claude-auto-plan-mode:auto-plan-tools` slash command.

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
| `/claude-auto-plan-mode:auto-plan-status` | Report whether the flag file exists. |
| `/claude-auto-plan-mode:auto-plan-tools` | Activate. Writes `~/.claude/auto-plan-tools`. |
| `/claude-auto-plan-mode:auto-plan-clear` | Panic off. Deletes the flag file. |

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
│   └── auto-plan-tools.md
└── docs/
    └── hook-response-format.md
```

The `PreToolUse` hook fires on every tool call. It reads `tool_name` and `permission_mode` from stdin, checks the flag file in `~/.claude/`, and emits a `hookSpecificOutput.permissionDecision = "allow"` JSON response to bypass the approval dialog when appropriate. Outside plan mode, or with no flag set, the hook is a fast no-op.

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

`permissionDecision` accepts `"allow"`, `"deny"`, or `"ask"`. This plugin only emits `"allow"` (or nothing, which is equivalent to the default flow).

The hook is fail-open: every error path exits 0 with empty stdout, so a malformed payload or filesystem hiccup never blocks Claude.

## Why `ExitPlanMode` isn't auto-accepted

Empirically (tested against Claude Code 2.1.139), `permissionDecision: "allow"` from a PreToolUse hook is honored for all the regular tools — Bash, Edit/Write/MultiEdit, MCP calls, skill invocations, the Agent tool, WebFetch — but it does NOT bypass the `ExitPlanMode` ("Accept this plan?") dialog. That tool is special-cased in the webview bundle; the dialog renders independent of hook output.

This matches Anthropic's design intent for plan mode: accepting the plan is a deliberate user decision. We respect that. If you want full walk-away (also auto-accepting the plan), upvote [anthropics/claude-code#46517](https://github.com/anthropics/claude-code/issues/46517).

## Configuration

The flag file is the entire interface (no environment variables):

| Path | Set by | Effect |
| :--- | :--- | :--- |
| `~/.claude/auto-plan-tools` | Picker click via UI extension, or `auto-plan-tools` slash command | Auto-approve tool calls in plan mode. |

Switching to any non-Auto-plan mode clears the flag automatically.

## License

MIT — see [LICENSE](LICENSE).
