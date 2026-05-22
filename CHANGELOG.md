# Changelog

## 0.2.0 — 2026-05-22

- **SessionStart hook (`verify-patch.js`)**: CLI-side safety net that detects when the companion `claude-auto-plan-mode-ui` patch is missing from the current Anthropic Claude Code extension bundle. Logs a one-line warning at session start so the user can re-apply manually. Decoupled from the VSCode extension lifecycle, so it catches race conditions the UI extension's own auto-recovery layers miss (e.g. when Anthropic swaps the entire extension-versjons-mappe and `fs.watch` on the old path silently dies).

## 0.1.0 — 2026-05-13

Initial release.

- **Auto plan mode**: `PreToolUse:*` hook auto-approves tool calls (Bash, MCP, skills, Agent, WebFetch, etc.) while plan mode is active and `~/.claude/auto-plan-tools` flag is present.
- `ExitPlanMode` is intentionally NOT auto-approved — Claude Code special-cases that dialog as a deliberate user decision, and hook output does not bypass it. The standard "Accept this plan?" dialog still appears.
- Three slash commands: `auto-plan-status` (report flag state), `auto-plan-tools` (write flag manually), `auto-plan-clear` (remove flag).
- Companion VSCode extension `claude-auto-plan-mode-ui` patches the Anthropic webview bundle to add an "Auto plan mode" entry to the permission-mode picker, and forwards the picker click to this plugin via `vscode.commands.executeCommand("claudeAutoPlanMode.activateTools")`.
