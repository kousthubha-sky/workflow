/**
 * skills-loader.js
 * Skills lifecycle — delegates to skills-integration.js for full skills.sh support.
 *
 * Install strategy (in order):
 *   1. Try `npx skills add <pkg>` — uses skills.sh registry
 *   2. Fall back to builtin skill files bundled with persistent
 *   3. If neither — write a minimal placeholder
 *
 * Enhanced with:
 *   - `npx skills search` — dynamic skill discovery
 *   - `npx skills create` — create skills from project patterns
 *   - `npx skills update` — version management
 *   - Obsidian pattern mining for skill candidates
 *
 * Skills are written to `.skills/<owner>/<name>.md` in the project root.
 */

import chalk from "chalk";
import ora from "ora";
import fs from "fs/promises";
import path from "path";
import {
  resolveSkills as deepResolve,
  installSkills as deepInstall,
  searchSkills,
  discoverSkills,
  updateSkills,
  createSkillFromProject,
  evolveSkill,
  listInstalledSkills,
  extractSkillCandidates,
} from "./skills-integration.js";

// ─── Backward-compatible exports ────────────────────────────────────────────

/**
 * Resolve which skills to install given detected stack keys.
 * @param {string[]} stackKeys
 * @returns {Promise<string[]>} skill ids (deduplicated)
 */
export async function resolveSkills(stackKeys) {
  return deepResolve(stackKeys);
}

/**
 * Install skills for a project.
 * Delegates to skills-integration which uses skills.sh CLI when available.
 *
 * @param {string[]} skillIds
 * @param {string} cwd
 * @returns {Promise<Object>}
 */
export async function installSkills(skillIds, cwd) {
  return deepInstall(skillIds, cwd);
}

/**
 * Install a single skill manually (persistent add-skill <id>).
 * Enhanced: tries registry → builtin → placeholder, updates context.
 * @param {string} skillId
 * @param {string} cwd
 * @param {Object} cfg
 */
export async function addSkill(skillId, cwd, cfg) {
  const result = await deepInstall([skillId], cwd);

  // Update AGENT_CONTEXT.md skills line
  const ctxPath = path.join(cwd, "AGENT_CONTEXT.md");
  try {
    let content = await fs.readFile(ctxPath, "utf8");
    const match = content.match(/^> skills:\[(.+)\]/m);
    if (match) {
      const existing = match[1].split(",").map((s) => s.trim());
      if (!existing.includes(skillId)) {
        existing.push(skillId);
        content = content.replace(/^> skills:\[.+\]/m, `> skills:[${existing.join(",")}]`);
        await fs.writeFile(ctxPath, content, "utf8");
      }
    }
  } catch {
    // No AGENT_CONTEXT.md yet
  }

  const source = result.installed.includes(skillId)
    ? "registry"
    : result.builtin.includes(skillId)
    ? "builtin"
    : "placeholder";
  console.log(chalk.green("✓") + ` Added ${chalk.cyan(skillId)} (${source})`);
}

// ─── New capabilities (exposed for CLI + plugin) ────────────────────────────

export {
  searchSkills,
  discoverSkills,
  updateSkills,
  createSkillFromProject,
  evolveSkill,
  listInstalledSkills,
  extractSkillCandidates,
};
