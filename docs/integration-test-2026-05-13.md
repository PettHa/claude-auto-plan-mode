# Integration test report — 2026-05-13

Anthropic Claude Code 2.1.139 (win32-x64). Plugin v0.1.0 + UI extension v0.1.0.

## Status overview

| Area | Status |
|---|---|
| VSCode extension install | ✅ |
| TypeScript compile | ✅ 0 errors |
| Plugin `claude plugin validate` | ✅ |
| Bundle patches applied on disk | ✅ all 3 markers present |
| Worktree-manager coexistence | ✅ both extensions' patches stack |
| PreToolUse hook scenarios | ✅ 6/6 pass (1 needs production runtime to verify) |
| UserPromptSubmit hook scenarios | ✅ 6/6 pass |
| End-to-end UI flow | ⚠️ requires reload — user reported entries visible in picker |

## Bundle state

Anthropic webview `index.js` after extension reload:

```
4799335  webview/index.js              (live, +848 from original)
4798391  webview/index.js.bak          (worktree-manager's backup, original-original)
4798487  webview/index.js.autoplan.bak (our backup, captured post-worktree-manager)
```

Markers in live bundle:
- `"Auto plan mode"` × 1 ✅
- `"Full auto plan mode"` × 1 ✅
- `claude-auto-plan` (onClick handler) × 1 ✅
- worktree-manager `rev-parse` × 1 ✅
- worktree-manager `new-session-hijack` × 1 ✅

The 3s + 2s delayed-retry strategy lets worktree-manager apply first, then we
stack on top. Both extensions' patches coexist.

## PreToolUse hook (`auto-approve-during-plan.js`)

Test matrix (✅ = behaves as designed):

| permission_mode | flags | tool_name | Output | Status |
|---|---|---|---|---|
| `default` | any | any | (empty) | ✅ passthrough |
| `plan` | none | Bash | (empty) | ✅ passthrough |
| `plan` | tools only | Bash | `{permissionDecision:"allow"}` | ✅ Mode 1 allow |
| `plan` | tools only | ExitPlanMode | (empty) | ✅ Mode 1 defers to manual accept |
| `plan` | full (both) | Bash | `{permissionDecision:"allow"}` | ✅ Mode 2 allow |
| `plan` | full (both) | ExitPlanMode | `{permissionDecision:"allow",permissionMode:"auto"}` | ✅ Mode 2 accept + transition request |
| malformed stdin | — | — | (empty), exit 0 | ✅ fail-open |

Side effects of Mode 2 + ExitPlanMode:
- ✅ `clearAll()` removes both flag files (plan being accepted, flags consumed)
- ⚠️ `writeTransitionSignal()` blocked by Bash-tool sandbox classifier (see note below)

## UserPromptSubmit hook (`prompt-detect-plan-mode.js`)

| Scenario | Output | Status |
|---|---|---|
| `permission_mode=default` | (empty) | ✅ passthrough |
| `permission_mode=plan`, no flag, new session | 927-char `additionalContext` with all 3 options | ✅ injects ask |
| Same session retry | (empty) | ✅ asked-marker prevents nagging |
| Different session, no flag | 927-char injection | ✅ re-asks per session |
| Flag already set | (empty) | ✅ no nag once user has chosen |
| Malformed stdin | (empty), exit 0 | ✅ fail-open |

The injection asks the model to use `AskUserQuestion` to present three options
(Mode 1, Mode 2, plain plan) and run the appropriate slash command.

## Sandbox quirk: transition-signal write blocked

The `auto-plan-transition-to-auto` filename is **specifically blocked** by Claude
Code's auto-mode Bash classifier when written from within a Bash tool invocation:

```
# All four writes via Node:
test-arbitrary                  → persists ✅
auto-plan-foo                   → persists ✅
auto-plan-bar                   → persists ✅
auto-plan-transition-to-auto    → blocked (Node thinks write succeeded; file gone after process exits)
```

The classifier appears to detect the "transition-to-auto" semantic in the
filename as a privilege-escalation attempt and silently drops the write at the
sandbox layer. Other arbitrary names under `~/.claude/` persist normally.

**Why this is not a production bug:** plugin hooks run via Claude Code's hook
spawner, not via the Bash tool. The Bash sandbox does not apply to hook
processes. The transition-signal write should work in real plugin hook
execution. This finding is testing-infrastructure noise, not a defect, but it
prevents end-to-end verification of Mode 2 transition from this test context.

**Recommended verification (manual):** invoke ExitPlanMode while Mode 2 is
active, then check whether `~/.claude/auto-plan-transition-to-auto` was
written by the plugin hook (not by the Bash tool). If yes, the VSCode
extension's `setupTransitionWatcher` fires and switches permission mode to
`auto` via `claude-code.setPermissionMode`.

## Open issues remaining

1. **Picker → flag bridge** (resolved via UserPromptSubmit asking flow): the
   patched onClick handler posts a message to the webview host that Anthropic's
   extension ignores. Our extension cannot listen to another extension's
   webview. The bridge is now: picker click → backend goes to plan mode →
   next user prompt triggers our hook → model asks user → user picks tier →
   model runs slash command → flag file written. One-time ask per session.

2. **Mode 2 `permissionMode` field** — speculative: the hook's
   `hookSpecificOutput.permissionMode` field is documented as a `PermissionDenied`
   retry hint, not a `PreToolUse` override. If Claude Code does not respect it
   for `PreToolUse`, Mode 2's transition relies entirely on variant B (signal
   file + VSCode-extension file-watcher). Empirical test pending.

3. **`claude-code.setPermissionMode` command id** — not a published API. Our
   VSCode extension calls it speculatively. If it does not exist, the file-watch
   triggers but no mode change happens. The model could still proceed in plan
   mode after auto-accept. Phase 4 verification pending.

4. **Icon differentiation** — both new picker entries currently use the
   plan-mode icon (`Iq1`) as a fallback. Visually they look identical to the
   existing Plan mode entry. Improve by sourcing distinct Lucide-icon refs from
   the bundle (see `src/patcher.ts` PATCH_MODE_ENTRIES comment).

## What to verify manually after a Claude Code restart

1. Open the mode picker (Shift+Tab or click). Verify two new entries appear:
   "Auto plan mode" and "Full auto plan mode".
2. Click "Auto plan mode". Verify backend permission mode switches to plan.
3. Submit any prompt. Verify the model asks you to choose Mode 1 / Mode 2 /
   plain plan via `AskUserQuestion`.
4. Pick "Mode 1". Verify subsequent Bash, MCP, Skill calls auto-approve without
   dialogs. Verify `ExitPlanMode` still shows the standard accept dialog.
5. Reset (`/claude-auto-plan-mode:auto-plan-clear`) and pick "Mode 2" in the
   ask. Verify auto-approve for tool calls AND that `ExitPlanMode` auto-accepts.
   Verify the mode picker then shows "Auto mode" as the active mode (transition).
6. Switch the picker to any other mode. Verify `~/.claude/auto-plan-tools` and
   `auto-plan-full` are cleared (no leak across mode boundaries).
