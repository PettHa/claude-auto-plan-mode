"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

const toolsPath = path.join(os.homedir(), ".claude", "auto-plan-tools");

function isToolsActive() {
  return fs.existsSync(toolsPath);
}

function activateTools() {
  fs.mkdirSync(path.dirname(toolsPath), { recursive: true });
  fs.writeFileSync(toolsPath, JSON.stringify({ activatedAt: Date.now() }));
}

function clearAll() {
  try {
    fs.unlinkSync(toolsPath);
  } catch {
    // ignore
  }
}

module.exports = {
  toolsPath,
  isToolsActive,
  activateTools,
  clearAll,
};
