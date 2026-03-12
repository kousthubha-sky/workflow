/**
 * config.js
 * Reads/writes .persistent.json in project root — persistent state across commands.
 */

import fs from "fs/promises";
import path from "path";

const CONFIG_FILE = ".persistent.json";

/** @returns {Promise<persistentConfig>} */
export async function readConfig(cwd = process.cwd()) {
  const cfgPath = path.join(cwd, CONFIG_FILE);
  try {
    const raw = await fs.readFile(cfgPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/** @param {persistentConfig} cfg */
export async function writeConfig(cfg, cwd = process.cwd()) {
  const cfgPath = path.join(cwd, CONFIG_FILE);
  await fs.writeFile(cfgPath, JSON.stringify(cfg, null, 2), "utf8");
}

/**
 * @typedef {Object} persistentConfig
 * @property {string}   [agent]          - Detected or forced agent id
 * @property {string}   [agentRoot]      - Absolute path to dir where agent file lives (monorepo root)
 * @property {string[]} [stack]          - Detected stack keys
 * @property {string[]} [skills]         - Installed skill ids
 * @property {string}   [obsidianPath]   - Absolute path to Obsidian vault root
 * @property {string[]} [pinnedFolders]  - Vault-relative folder paths always pulled into INDEX.md
 * @property {string}   [lastSync]       - ISO timestamp of last obsidian sync
 * @property {string}   [activeSpec]     - Slug of current active spec or null
 */
