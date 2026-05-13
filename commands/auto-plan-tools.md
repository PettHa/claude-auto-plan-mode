---
description: Activate Auto plan mode (Mode 1) — auto-approve tool calls during planning, but require manual approval to accept the plan. Use when the user wants tool-call auto-approve in plan mode without full walk-away.
---

Activate Auto plan mode (Mode 1). This writes the `~/.claude/auto-plan-tools` flag and removes `~/.claude/auto-plan-full` if it exists.

Run the following Bash command:

```bash
node -e "const fs=require('fs'),p=require('path'),o=require('os');const d=p.join(o.homedir(),'.claude');fs.mkdirSync(d,{recursive:true});fs.writeFileSync(p.join(d,'auto-plan-tools'),JSON.stringify({activatedAt:Date.now()}));try{fs.unlinkSync(p.join(d,'auto-plan-full'))}catch{}console.log('Mode 1 active')"
```

Then tell the user:

- Auto plan mode (Mode 1) is now active.
- While the session is in plan mode, tool calls will be auto-approved by the PreToolUse hook.
- `ExitPlanMode` will still prompt for manual approval — you must click "Accept plan" yourself.
- Run `/claude-auto-plan-mode:auto-plan-clear` to turn it off.
