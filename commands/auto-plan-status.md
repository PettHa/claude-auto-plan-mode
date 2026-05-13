---
description: Check whether Auto plan mode flags are active. Use when the user asks "is auto plan on?" or wants to verify state of the auto-plan-tools and auto-plan-full flag files.
---

Check the current state of the Auto plan mode flag files and report which mode (if any) is active.

Run the following Bash command (cross-platform via Node) and read the result:

```bash
node -e "const fs=require('fs'),p=require('path'),o=require('os');const t=p.join(o.homedir(),'.claude','auto-plan-tools'),f=p.join(o.homedir(),'.claude','auto-plan-full');const tt=fs.existsSync(t),ff=fs.existsSync(f);console.log(JSON.stringify({toolsFlag:tt,fullFlag:ff,mode:ff?'Full auto plan mode (Mode 2)':(tt?'Auto plan mode (Mode 1)':'inactive')}))"
```

Then report to the user:

- If `mode` is `inactive`: tell them no Auto plan mode flag is set; tool calls and ExitPlanMode follow the default approval flow.
- If `Auto plan mode (Mode 1)`: tell them tool calls during plan mode will be auto-approved, but ExitPlanMode still requires manual approval.
- If `Full auto plan mode (Mode 2)`: tell them tool calls AND ExitPlanMode will be auto-approved, and the session will transition to Auto mode after plan acceptance.

Also include the raw `toolsFlag` / `fullFlag` boolean values so it's clear which files exist on disk.
