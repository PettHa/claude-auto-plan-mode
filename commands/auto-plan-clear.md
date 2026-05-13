---
description: Manually clear all Auto plan mode flags. Use as a panic-off when the VSCode picker did not clear them or when running without the companion UI extension.
---

Delete both Auto plan mode flag files so the PreToolUse hook stops auto-approving tool calls in plan mode.

Run the following Bash command:

```bash
node -e "const fs=require('fs'),p=require('path'),o=require('os');for(const n of ['auto-plan-tools','auto-plan-full','auto-plan-transition-to-auto']){try{fs.unlinkSync(p.join(o.homedir(),'.claude',n))}catch{}}console.log('cleared')"
```

Then confirm to the user that both flag files (and any stale transition signal) have been removed. Auto plan mode is now off; tool calls in plan mode will follow the default approval flow again.
