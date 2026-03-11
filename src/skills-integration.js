/**
 * skills-integration.js
 * Deep integration with skills.sh — the dynamic skill development engine.
 *
 * skills.sh is not just an installer — it's the full lifecycle manager
 * for AI context skills: search, create, evolve, publish, version.
 *
 * Flow:
 *   detect-stack → skills search (dynamic discovery)
 *   Obsidian patterns (#pattern, #skill) → skills create (from project knowledge)
 *   Project analysis → skills evolve (update skills as code changes)
 *   skills publish → community contribution
 *
 * CLI dependency: `npx skills` (graceful fallback to local engine)
 */

import { execSync } from "child_process";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";
import ora from "ora";
import { glob } from "glob";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILLS_MAP_PATH = path.join(__dirname, "../config/skills-map.json");
const BUILTIN_DIR = path.join(__dirname, "../config/builtin-skills");
const SKILLS_DIR = ".skills";

// ─── skills.sh CLI Detection ────────────────────────────────────────────────

let _skillsAvailable = null;

/**
 * Check if the skills.sh CLI is available.
 * @returns {Promise<boolean>}
 */
export async function isSkillsCliAvailable() {
  if (_skillsAvailable !== null) return _skillsAvailable;
  try {
    execSync("npx --yes skills --version", { stdio: "pipe", timeout: 15_000 });
    _skillsAvailable = true;
  } catch {
    _skillsAvailable = false;
  }
  return _skillsAvailable;
}

/**
 * Run a skills.sh CLI command.
 * @param {string} args - CLI arguments
 * @param {string} cwd - Working directory
 * @returns {Promise<{ ok: boolean, stdout: string, stderr: string }>}
 */
async function runSkillsCli(args, cwd) {
  try {
    const stdout = execSync(`npx --yes skills ${args}`, {
      cwd,
      stdio: "pipe",
      timeout: 30_000,
      encoding: "utf8",
    });
    return { ok: true, stdout: stdout.trim(), stderr: "" };
  } catch (err) {
    return {
      ok: false,
      stdout: err.stdout?.toString() ?? "",
      stderr: err.stderr?.toString() ?? err.message,
    };
  }
}

// ─── Dynamic Skill Discovery ────────────────────────────────────────────────

/**
 * Search skills.sh registry for skills matching stack/query.
 * Goes beyond the static skills-map.json — discovers community skills.
 *
 * @param {string} query - Search term (e.g., "nextjs auth", "prisma orm")
 * @param {Object} opts
 * @param {string[]} opts.stack - Detected stack keys for context
 * @returns {Promise<Object[]>} Array of { id, name, description, owner, version }
 */
export async function searchSkills(query, opts = {}) {
  const hasCli = await isSkillsCliAvailable();

  if (hasCli) {
    const result = await runSkillsCli(`search "${query}"`, process.cwd());
    if (result.ok) {
      return parseSkillsSearchOutput(result.stdout);
    }
  }

  // Fallback: search local skills-map for partial matches
  const map = await loadSkillsMap();
  const results = [];
  const queryLower = query.toLowerCase();

  for (const [stackKey, skillIds] of Object.entries(map)) {
    if (stackKey.includes(queryLower) || queryLower.includes(stackKey)) {
      for (const id of skillIds) {
        results.push({
          id,
          name: id.split("/")[1],
          owner: id.split("/")[0],
          source: "skills-map",
        });
      }
    }
  }

  return results;
}

/**
 * Discover all relevant skills for a detected stack.
 * Uses skills.sh search for each stack key to find community skills
 * beyond what's in skills-map.json.
 *
 * @param {string[]} stackKeys - Detected stack keys
 * @param {string} cwd - Project root
 * @returns {Promise<{ mapped: string[], discovered: string[] }>}
 */
export async function discoverSkills(stackKeys, cwd) {
  const map = await loadSkillsMap();
  const mapped = new Set();
  const discovered = new Set();

  // 1. Static mapping
  for (const key of stackKeys) {
    for (const id of map[key] ?? []) {
      mapped.add(id);
    }
  }

  // 2. Dynamic discovery via skills.sh
  const hasCli = await isSkillsCliAvailable();
  if (hasCli) {
    for (const key of stackKeys) {
      const result = await runSkillsCli(`search "${key}" --limit 3`, cwd);
      if (result.ok) {
        const found = parseSkillsSearchOutput(result.stdout);
        for (const skill of found) {
          if (!mapped.has(skill.id)) {
            discovered.add(skill.id);
          }
        }
      }
    }
  }

  return {
    mapped: [...mapped],
    discovered: [...discovered],
  };
}

// ─── Skill Installation (Enhanced) ─────────────────────────────────────────

/**
 * Install skills with full skills.sh lifecycle support.
 * Tries: registry → builtin → placeholder.
 * Tracks versions and sources for future updates.
 *
 * @param {string[]} skillIds
 * @param {string} cwd
 * @returns {Promise<Object>}
 */
export async function installSkills(skillIds, cwd) {
  if (skillIds.length === 0) return { installed: [], builtin: [], placeholder: [] };

  const result = { installed: [], builtin: [], placeholder: [], manifest: [] };
  const spinner = ora(`Installing ${skillIds.length} skills...`).start();
  const hasCli = await isSkillsCliAvailable();

  for (const skill of skillIds) {
    // 1. Try skills.sh CLI
    if (hasCli) {
      const cliResult = await runSkillsCli(`add ${skill}`, cwd);
      if (cliResult.ok) {
        result.installed.push(skill);

        // Track version info
        const versionResult = await runSkillsCli(`info ${skill} --json`, cwd);
        if (versionResult.ok) {
          try {
            const info = JSON.parse(versionResult.stdout);
            result.manifest.push({
              id: skill,
              version: info.version,
              source: "skills.sh",
              installedAt: new Date().toISOString(),
            });
          } catch {
            result.manifest.push({ id: skill, source: "skills.sh" });
          }
        }

        spinner.text = `Installed ${chalk.cyan(skill)} (skills.sh)`;
        continue;
      }
    }

    // 2. Try builtin
    const builtinContent = await loadBuiltin(skill);
    if (builtinContent) {
      await writeSkillFile(skill, builtinContent, cwd);
      result.builtin.push(skill);
      result.manifest.push({ id: skill, source: "builtin" });
      spinner.text = `Installed ${chalk.cyan(skill)} (builtin)`;
      continue;
    }

    // 3. Placeholder
    const [owner, name] = skill.split("/");
    const placeholder = `# ${skill}\n\n> Skill not available in registry or builtins.\n> Install manually: \`npx skills add ${skill}\`\n>\n> Or fill in your own best practices for ${name} (${owner}) here.\n> This file is read by your AI agent as context.\n`;
    await writeSkillFile(skill, placeholder, cwd);
    result.placeholder.push(skill);
    result.manifest.push({ id: skill, source: "placeholder" });
  }

  // Write skill manifest for tracking
  await writeSkillManifest(cwd, result.manifest);

  // Summary
  const parts = [];
  if (result.installed.length) parts.push(`${result.installed.length} from skills.sh`);
  if (result.builtin.length) parts.push(`${result.builtin.length} builtin`);
  if (result.placeholder.length) parts.push(`${result.placeholder.length} placeholder`);
  spinner.succeed(`Skills ready: ${parts.join(" · ")} → .skills/`);

  return result;
}

/**
 * Update installed skills to latest versions.
 * Uses skills.sh CLI for version management.
 *
 * @param {string} cwd
 * @param {Object} opts
 * @param {string[]} opts.only - Only update specific skills
 * @returns {Promise<Object>}
 */
export async function updateSkills(cwd, opts = {}) {
  const hasCli = await isSkillsCliAvailable();
  const manifest = await loadSkillManifest(cwd);
  const spinner = ora("Checking for skill updates...").start();
  const results = { updated: [], skipped: [], failed: [] };

  const targets = opts.only
    ? manifest.filter((m) => opts.only.includes(m.id))
    : manifest;

  for (const entry of targets) {
    if (entry.source !== "skills.sh" && !hasCli) {
      results.skipped.push(entry.id);
      continue;
    }

    if (hasCli) {
      const result = await runSkillsCli(`update ${entry.id}`, cwd);
      if (result.ok) {
        results.updated.push(entry.id);
        spinner.text = `Updated ${chalk.cyan(entry.id)}`;
      } else {
        results.failed.push(entry.id);
      }
    } else {
      results.skipped.push(entry.id);
    }
  }

  spinner.succeed(
    `Skills update: ${results.updated.length} updated, ${results.skipped.length} skipped`
  );
  return results;
}

// ─── Dynamic Skill Creation (from Obsidian + Project) ───────────────────────

/**
 * Create a new skill from Obsidian patterns and project analysis.
 * This is the "dynamic skill dev" the user wants — skills evolve
 * from the project's own patterns, not just from a registry.
 *
 * @param {string} skillId - e.g., "myteam/auth-patterns"
 * @param {string} cwd
 * @param {Object} opts
 * @param {Object[]} opts.obsidianNotes - Notes tagged #pattern or #skill
 * @param {Object} opts.cliAI - CLI's native AI for generation
 * @param {string[]} opts.stack - Detected stack
 * @param {Object} opts.codePatterns - Extracted code patterns
 */
export async function createSkillFromProject(skillId, cwd, opts = {}) {
  const spinner = ora(`Creating skill: ${chalk.cyan(skillId)}`).start();
  const hasCli = await isSkillsCliAvailable();
  const [owner, name] = skillId.split("/");

  // 1. Gather context from Obsidian notes
  const obsidianContent = formatObsidianPatternsForSkill(
    opts.obsidianNotes || [],
    name
  );

  // 2. Gather context from project code analysis
  const codeContent = await analyzeProjectForSkill(cwd, name, opts.stack || []);

  // 3. Generate skill content
  let skillContent;

  if (opts.cliAI) {
    spinner.text = "Using AI to synthesize skill from patterns...";
    const prompt = `
Generate a skills.sh compatible skill file for: ${skillId}

DETECTED STACK: ${(opts.stack || []).join(", ")}

OBSIDIAN PATTERNS (from user's knowledge vault):
${obsidianContent || "No relevant Obsidian notes."}

CODE PATTERNS (extracted from project):
${codeContent || "No patterns extracted."}

FORMAT: Create a markdown skill file with these sections:
1. Header with skill name and description
2. ## Patterns — Best practices to follow
3. ## Examples — Code snippets showing correct usage
4. ## Anti-Patterns — What to avoid
5. ## References — Links and resources

Make patterns specific and actionable. Use code blocks for examples.
The skill file should be directly useful to an AI coding agent.
`;

    try {
      const response = await opts.cliAI.generate({
        prompt,
        maxTokens: 1500,
        temperature: 0,
      });
      skillContent = response.text;
    } catch {
      // Fallback to template
      skillContent = buildSkillTemplate(skillId, obsidianContent, codeContent);
    }
  } else {
    skillContent = buildSkillTemplate(skillId, obsidianContent, codeContent);
  }

  // 4. Write skill file
  await writeSkillFile(skillId, skillContent, cwd);

  // 5. If skills.sh CLI is available, register it
  if (hasCli) {
    const result = await runSkillsCli(
      `create ${skillId} --from "${path.join(cwd, SKILLS_DIR, owner, name + ".md")}"`,
      cwd
    );
    if (result.ok) {
      spinner.succeed(`Skill created + registered: ${chalk.cyan(skillId)}`);
      return { method: "skills.sh", success: true };
    }
  }

  spinner.succeed(`Skill created locally: ${chalk.cyan(skillId)}`);
  return { method: "local", success: true };
}

/**
 * Evolve an existing skill with new patterns from project changes.
 * This keeps skills up-to-date as the codebase evolves.
 *
 * @param {string} skillId
 * @param {string} cwd
 * @param {Object} opts
 * @param {Object} opts.cliAI - CLI's native AI
 * @param {Object[]} opts.newPatterns - New patterns from Obsidian/code
 */
export async function evolveSkill(skillId, cwd, opts = {}) {
  const spinner = ora(`Evolving skill: ${chalk.cyan(skillId)}`).start();
  const skillPath = path.join(cwd, skillIdToPath(skillId));

  // Read current skill
  let currentContent;
  try {
    currentContent = await fs.readFile(skillPath, "utf8");
  } catch {
    spinner.fail(`Skill not found: ${skillId}`);
    return { success: false, error: "not-found" };
  }

  const newPatterns = opts.newPatterns || [];
  if (newPatterns.length === 0) {
    spinner.info("No new patterns to merge");
    return { success: true, changed: false };
  }

  if (opts.cliAI) {
    const prompt = `
Update this skill file with new patterns:

CURRENT SKILL (${skillId}):
${currentContent}

NEW PATTERNS TO MERGE:
${newPatterns.map((p) => `- ${p.title || p}: ${p.content || ""}`).join("\n")}

RULES:
1. Don't duplicate existing patterns
2. Keep the same format and sections
3. Add new patterns under appropriate sections
4. If a pattern conflicts with existing ones, prefer the newer one
5. Keep the file concise

Output the complete updated skill file.
`;

    try {
      const response = await opts.cliAI.generate({
        prompt,
        maxTokens: 1500,
        temperature: 0,
      });
      await fs.writeFile(skillPath, response.text, "utf8");
      spinner.succeed(`Skill evolved: ${chalk.cyan(skillId)} (+${newPatterns.length} patterns)`);
      return { success: true, changed: true, method: "ai" };
    } catch {
      // Fallback to static append
    }
  }

  // Static merge: append new patterns
  const addSection = `\n\n## New Patterns (${new Date().toISOString().slice(0, 10)})\n${newPatterns
    .map((p) => `- ${typeof p === "string" ? p : p.title || p.content}`)
    .join("\n")}\n`;

  await fs.writeFile(skillPath, currentContent + addSection, "utf8");
  spinner.succeed(`Skill evolved: ${chalk.cyan(skillId)} (+${newPatterns.length} patterns)`);
  return { success: true, changed: true, method: "append" };
}

/**
 * List installed skills with status info.
 * @param {string} cwd
 * @returns {Promise<Object[]>}
 */
export async function listInstalledSkills(cwd) {
  const skills = [];
  const skillsDir = path.join(cwd, SKILLS_DIR);

  try {
    const owners = await fs.readdir(skillsDir, { withFileTypes: true });
    for (const ownerEntry of owners) {
      if (!ownerEntry.isDirectory()) continue;
      const ownerDir = path.join(skillsDir, ownerEntry.name);
      const files = await fs.readdir(ownerDir);

      for (const file of files) {
        if (!file.endsWith(".md")) continue;
        const name = file.replace(".md", "");
        const id = `${ownerEntry.name}/${name}`;
        const stat = await fs.stat(path.join(ownerDir, file));

        skills.push({
          id,
          owner: ownerEntry.name,
          name,
          modified: stat.mtime,
          size: stat.size,
        });
      }
    }
  } catch {
    // No .skills directory yet
  }

  // Merge with manifest for source info
  const manifest = await loadSkillManifest(cwd);
  for (const skill of skills) {
    const entry = manifest.find((m) => m.id === skill.id);
    if (entry) {
      skill.source = entry.source;
      skill.version = entry.version;
    }
  }

  return skills;
}

// ─── Obsidian → Skills Bridge ───────────────────────────────────────────────

/**
 * Extract skill-worthy patterns from Obsidian notes.
 * Notes tagged #pattern, #skill, #best-practice become skill candidates.
 *
 * @param {Object[]} notes - Obsidian notes
 * @returns {Object[]} Candidate patterns for skill creation/evolution
 */
export function extractSkillCandidates(notes) {
  if (!notes?.length) return [];

  const candidates = [];

  for (const note of notes) {
    const content = (note.content || "").toLowerCase();
    const isSkillRelevant =
      content.includes("#pattern") ||
      content.includes("#skill") ||
      content.includes("#best-practice") ||
      content.includes("#convention");

    if (!isSkillRelevant) continue;

    // Extract individual patterns from the note
    const lines = (note.content || "").split("\n");
    for (const line of lines) {
      if (line.startsWith("- ") || line.startsWith("* ")) {
        const item = line.slice(2).trim();
        if (item.length > 10 && !item.startsWith("#")) {
          candidates.push({
            title: item.slice(0, 80),
            content: item,
            source: note.rel || "obsidian",
            type: "pattern",
          });
        }
      }
    }
  }

  return candidates;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function skillIdToFilename(id) {
  return id.replace("/", "__") + ".md";
}

function skillIdToPath(id) {
  const [owner, name] = id.split("/");
  return path.join(SKILLS_DIR, owner, name + ".md");
}

async function loadSkillsMap() {
  const raw = await fs.readFile(SKILLS_MAP_PATH, "utf8");
  return JSON.parse(raw);
}

async function loadBuiltin(skillId) {
  const filename = skillIdToFilename(skillId);
  try {
    return await fs.readFile(path.join(BUILTIN_DIR, filename), "utf8");
  } catch {
    return null;
  }
}

async function writeSkillFile(skillId, content, cwd) {
  const fullPath = path.join(cwd, skillIdToPath(skillId));
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, content, "utf8");
}

async function writeSkillManifest(cwd, entries) {
  const manifestPath = path.join(cwd, SKILLS_DIR, ".manifest.json");
  const existing = await loadSkillManifest(cwd);

  // Merge: update existing entries, add new ones
  const merged = [...existing];
  for (const entry of entries) {
    const idx = merged.findIndex((m) => m.id === entry.id);
    if (idx >= 0) {
      merged[idx] = { ...merged[idx], ...entry };
    } else {
      merged.push(entry);
    }
  }

  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.writeFile(manifestPath, JSON.stringify(merged, null, 2), "utf8");
}

async function loadSkillManifest(cwd) {
  const manifestPath = path.join(cwd, SKILLS_DIR, ".manifest.json");
  try {
    const raw = await fs.readFile(manifestPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function formatObsidianPatternsForSkill(notes, skillName) {
  if (!notes?.length) return "";

  const relevant = notes.filter((note) => {
    const content = (note.content || "").toLowerCase();
    return (
      content.includes(skillName.toLowerCase()) ||
      content.includes("#pattern") ||
      content.includes("#skill")
    );
  });

  if (relevant.length === 0) return "";

  return relevant
    .slice(0, 5)
    .map((n) => {
      const preview = (n.content || "").split("\n").slice(0, 10).join("\n");
      return `### ${n.rel || "note"}\n${preview}`;
    })
    .join("\n\n");
}

async function analyzeProjectForSkill(cwd, skillName, stack) {
  // Look for patterns in project code that relate to this skill
  const patterns = [];

  const filePatterns = [
    `**/*${skillName}*`,
    `**/lib/**/*.ts`,
    `**/src/**/*.ts`,
    `**/app/**/*.ts`,
  ];

  for (const pattern of filePatterns) {
    try {
      const files = await glob(pattern, {
        cwd,
        ignore: ["**/node_modules/**", "**/.next/**", "**/dist/**"],
        maxDepth: 4,
      });

      for (const file of files.slice(0, 3)) {
        try {
          const content = await fs.readFile(path.join(cwd, file), "utf8");
          patterns.push(`File: ${file}\n${content.slice(0, 500)}`);
        } catch {
          // Skip unreadable files
        }
      }
    } catch {
      // Pattern didn't match
    }
  }

  return patterns.join("\n---\n");
}

function buildSkillTemplate(skillId, obsidianContent, codeContent) {
  const [owner, name] = skillId.split("/");

  return `# ${name} (${owner})

> Generated by specflow from project patterns + Obsidian notes.
> Evolves with \`specflow skill evolve ${skillId}\`

## Patterns
${obsidianContent ? "### From Obsidian Vault\n" + obsidianContent : "<!-- Add patterns from your workflow -->"}

${codeContent ? "### From Project Code\n" + codeContent.slice(0, 500) : "<!-- Patterns extracted from your codebase -->"}

## Examples
<!-- Add code examples showing correct usage -->

## Anti-Patterns
<!-- What NOT to do -->

## References
<!-- Links to docs, ADRs, related skills -->
`;
}

function parseSkillsSearchOutput(stdout) {
  const results = [];
  const lines = stdout.split("\n").filter((l) => l.trim());

  for (const line of lines) {
    // Try to parse "owner/name - description" format
    const match = line.match(/^(\S+\/\S+)\s*[-—:]\s*(.*)$/);
    if (match) {
      const [, id, description] = match;
      const [owner, name] = id.split("/");
      results.push({ id, name, owner, description: description.trim() });
    }
  }

  return results;
}

// Re-export resolveSkills from original for backward compatibility
export async function resolveSkills(stackKeys) {
  const map = await loadSkillsMap();
  const skills = new Set();
  for (const key of stackKeys) {
    for (const s of map[key] ?? []) skills.add(s);
  }
  return [...skills];
}
