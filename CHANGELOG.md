# Changelog

## 0.1.0 — 2026-05-13

Initial release.

- **Auto plan mode**: `PreToolUse:*` hook auto-approves tool calls (Bash, MCP, skills, Agent, WebFetch, etc.) while plan mode is active and `~/.claude/auto-plan-tools` flag is present.
- `ExitPlanMode` is intentionally NOT auto-approved — Claude Code special-cases that dialog as a deliberate user decision, and hook output does not bypass it. The standard "Accept this plan?" dialog still appears.
- Three slash commands: `auto-plan-status` (report flag state), `auto-plan-tools` (write flag manually), `auto-plan-clear` (remove flag).
- Companion VSCode extension `claude-auto-plan-mode-ui` patches the Anthropic webview bundle to add an "Auto plan mode" entry to the permission-mode picker, and forwards the picker click to this plugin via `vscode.commands.executeCommand("claudeAutoPlanMode.activateTools")`.
