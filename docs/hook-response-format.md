# PreToolUse hook response format

This is a quick reference for the JSON shape `auto-approve-during-plan.js` writes to stdout when it wants Claude Code to skip the permission dialog for a tool call.

## Stdin payload

Claude Code invokes the hook with a JSON object on stdin. The fields this plugin relies on:

| Field | Type | Notes |
| :--- | :--- | :--- |
| `tool_name` | string | Name of the tool about to run (e.g. `Bash`, `Read`, `ExitPlanMode`). |
| `tool_input` | object | Tool-specific arguments. Not used by this plugin. |
| `permission_mode` | string | Current session permission mode. Plugin only acts when this is `"plan"`. |
| `session_id` | string | Session identifier. Not used. |

## Stdout response

The plugin emits a single JSON object on stdout and exits with code 0. Exit code is always 0 — the plugin is fail-open; on any internal error it emits nothing and the default approval flow runs.

### Allow a tool call

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow"
  }
}
```

`permissionDecision` accepts three values:

- `"allow"` — skip the dialog, run the tool.
- `"deny"` — block the tool with the dialog reason. Not used by this plugin.
- `"ask"` — explicitly fall through to the normal dialog (same effect as emitting nothing).

### Allow + request mode transition (Mode 2 ExitPlanMode)

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "permissionMode": "auto"
  }
}
```

The `permissionMode` field is **speculative**. The official `PreToolUse` schema documented in the Claude Code plugin reference covers `hookEventName` and `permissionDecision`; whether the hook handler honors `permissionMode` to change the session's mode has not been empirically verified against a specific Claude Code build. The companion UI extension (`claude-auto-plan-mode-ui`) provides a fallback path via the `~/.claude/auto-plan-transition-to-auto` signal file, which it watches with `fs.watch` and reacts to by issuing the equivalent VSCode command to switch the session to Auto mode.

The plugin emits both signals together — the JSON field and the signal file — so whichever mechanism Claude Code respects will succeed; the other is a no-op.

## Fail-open behavior

Any of these conditions cause the hook to exit 0 with empty stdout (no decision, default flow):

- Empty or unparseable stdin.
- `permission_mode !== "plan"`.
- Flag files absent for the relevant mode.
- Any thrown exception during processing.

The hook never writes to stderr in normal operation and never blocks the tool call on its own crash.
