/**
 * skills-loader.js
 * Maps detected stack keys → skills.sh package ids.
 *
 * Install strategy (in order):
 *   1. Try `npx skills add <pkg>` — uses skills.sh registry if available
 *   2. Fall back to builtin skill files bundled with agentflow
 *   3. If neither — write a minimal placeholder so AGENT_CONTEXT.md still references it
 *
 * Skills are written to `.skills/<owner>/<name>.md` in the project root.
 * The agent reads these automatically as part of its context.
 */

import { execSync } from "child_process";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";
import ora from "ora";

const __dirname       = path.dirname(fileURLToPath(import.meta.url));
const SKILLS_MAP_PATH = path.join(__dirname, "../config/skills-map.json");
const BUILTIN_DIR     = path.join(__dirname, "../config/builtin-skills");
const SKILLS_DIR      = ".skills";

/** skill id "owner/name" → filename "owner__name.md" */
function skillIdToFilename(id) {
  return id.replace("/", "__") + ".md";
}

/** skill id "owner/name" → relative path ".skills/owner/name.md" */
function skillIdToPath(id) {
  const [owner, name] = id.split("/");
  return path.join(SKILLS_DIR, owner, name + ".md");
}

async function loadSkillsMap() {
  const raw = await fs.readFile(SKILLS_MAP_PATH, "utf8");
  return JSON.parse(raw);
}

/**
 * Resolve which skills to install given detected stack keys.
 * @param {string[]} stackKeys
 * @returns {Promise<string[]>} skill ids (deduplicated)
 */
export async function resolveSkills(stackKeys) {
  const map = await loadSkillsMap();
  const skills = new Set();
  for (const key of stackKeys) {
    for (const s of map[key] ?? []) skills.add(s);
  }
  return [...skills];
}

/**
 * Try to load a builtin skill by id.
 * @param {string} skillId
 * @returns {Promise<string|null>} content or null if not bundled
 */
async function loadBuiltin(skillId) {
  const filename = skillIdToFilename(skillId);
  try {
    return await fs.readFile(path.join(BUILTIN_DIR, filename), "utf8");
  } catch {
    return null;
  }
}

/**
 * Write a skill file to .skills/<owner>/<name>.md
 * @param {string} skillId
 * @param {string} content
 * @param {string} cwd
 */
async function writeSkillFile(skillId, content, cwd) {
  const fullPath = path.join(cwd, skillIdToPath(skillId));
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, content, "utf8");
}

/**
 * Install skills for a project.
 * Tries registry first, falls back to builtins, writes placeholders for the rest.
 *
 * @param {string[]} skillIds
 * @param {string} cwd
 * @returns {Promise<{ installed: string[], builtin: string[], placeholder: string[] }>}
 */
export async function installSkills(skillIds, cwd) {
  if (skillIds.length === 0) return { installed: [], builtin: [], placeholder: [] };

  const result = { installed: [], builtin: [], placeholder: [] };
  const spinner = ora(`Installing ${skillIds.length} skills...`).start();

  for (const skill of skillIds) {
    // ── 1. Try registry ───────────────────────────────────────────────────
    let registryOk = false;
    try {
      execSync(`npx --yes skills add ${skill}`, {
        cwd,
        stdio: "pipe",
        timeout: 20_000,
      });
      registryOk = true;
    } catch {}

    if (registryOk) {
      result.installed.push(skill);
      spinner.text = `Installed ${chalk.cyan(skill)} (registry)`;
      continue;
    }

    // ── 2. Try builtin ────────────────────────────────────────────────────
    const builtinContent = await loadBuiltin(skill);
    if (builtinContent) {
      await writeSkillFile(skill, builtinContent, cwd);
      result.builtin.push(skill);
      spinner.text = `Installed ${chalk.cyan(skill)} (builtin)`;
      continue;
    }

    // ── 3. Write placeholder ──────────────────────────────────────────────
    const [owner, name] = skill.split("/");
    const placeholder = `# ${skill}\n\n> Builtin skill not available. Install manually:\n> \`npx skills add ${skill}\`\n>\n> Or fill in your own best practices for ${name} (${owner}) here.\n> This file is read by your AI agent as context.\n`;
    await writeSkillFile(skill, placeholder, cwd);
    result.placeholder.push(skill);
  }

  // Summary line
  const parts = [];
  if (result.installed.length)   parts.push(`${result.installed.length} from registry`);
  if (result.builtin.length)     parts.push(`${result.builtin.length} builtin`);
  if (result.placeholder.length) parts.push(`${result.placeholder.length} placeholder`);
  spinner.succeed(`Skills ready: ${parts.join(" · ")} → .skills/`);

  return result;
}

/**
 * Install a single skill manually (agentflow add-skill <id>).
 * @param {string} skillId
 * @param {string} cwd
 * @param {import('./config.js').AgentflowConfig} cfg
 */
export async function addSkill(skillId, cwd, cfg) {
  const spinner = ora(`Adding skill ${chalk.cyan(skillId)}...`).start();

  // Try registry → builtin → placeholder
  let source = null;

  try {
    execSync(`npx --yes skills add ${skillId}`, { cwd, stdio: "pipe", timeout: 20_000 });
    source = "registry";
  } catch {}

  if (!source) {
    const builtin = await loadBuiltin(skillId);
    if (builtin) {
      await writeSkillFile(skillId, builtin, cwd);
      source = "builtin";
    }
  }

  if (!source) {
    const [owner, name] = skillId.split("/");
    const placeholder = `# ${skillId}\n\n> Fill in best practices for ${name} (${owner}) here.\n> This file is read by your AI agent as context.\n`;
    await writeSkillFile(skillId, placeholder, cwd);
    source = "placeholder";
  }

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
  } catch {}

  spinner.succeed(`Added ${chalk.cyan(skillId)} (${source})`);
}
