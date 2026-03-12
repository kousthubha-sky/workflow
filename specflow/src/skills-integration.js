/**
 * skills-integration.js
 *
 * Integration with skills.sh — the open agent skills registry.
 *
 * skills.sh is the real engine. This module:
 *   1. Runs `npx skills add <owner/repo/skill>` for each stack-mapped skill
 *   2. Falls back to built-in markdown files if registry is unreachable
 *   3. Provides search, create, evolve, list operations
 *
 * Skill ID format (skills.sh canonical):  owner/repo/skill-name
 * Examples:
 *   vercel-labs/next-skills/next-best-practices
 *   shadcn/ui/shadcn
 *   anthropics/skills/frontend-design
 *   antfu/skills/vitest
 *
 * CLI:  npx skills add <owner/repo/skill-name>
 *       npx skills add <owner/repo>            (installs default skill)
 *       npx skills search <query>
 *       npx skills list
 */

import { execSync, spawnSync } from "child_process";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";
import ora from "ora";

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const MAP_PATH   = path.join(__dirname, "../config/skills-map.json");
const BUILTIN_DIR = path.join(__dirname, "../config/builtin-skills");
const SKILLS_DIR = ".skills";

// ─── skills.sh CLI ──────────────────────────────────────────────────────────

let _cliAvailable = null;

/**
 * Check if the skills.sh CLI is available via npx.
 * @returns {Promise<boolean>}
 */
export async function isSkillsCliAvailable() {
  if (_cliAvailable !== null) return _cliAvailable;
  try {
    execSync("npx --yes skills --version", { stdio: "pipe", timeout: 15_000 });
    _cliAvailable = true;
  } catch {
    _cliAvailable = false;
  }
  return _cliAvailable;
}

/**
 * Run `npx skills <args>` in the project directory.
 * Streams output live to user.
 *
 * @param {string[]} args
 * @param {string}   cwd
 */
function runSkills(args, cwd) {
  const result = spawnSync("npx", ["--yes", "skills", ...args], {
    cwd,
    stdio: "inherit",
    timeout: 60_000,
    shell: process.platform === "win32",
  });
  return { ok: result.status === 0 };
}

/**
 * Run `npx skills <args>` and capture stdout (for search/list parsing).
 * @param {string[]} args
 * @param {string}   cwd
 */
function captureSkills(args, cwd) {
  try {
    const out = execSync(["npx", "--yes", "skills", ...args].join(" "), {
      cwd,
      stdio: "pipe",
      timeout: 30_000,
      encoding: "utf8",
    });
    return { ok: true, stdout: out };
  } catch (err) {
    return { ok: false, stdout: err.stdout?.toString() ?? "", stderr: err.stderr?.toString() ?? "" };
  }
}

// ─── Stack → Skills Resolution ───────────────────────────────────────────────

/**
 * Resolve skill IDs for detected stack keys using skills-map.json.
 * @param {string[]} stackKeys
 * @returns {Promise<string[]>}
 */
export async function resolveSkills(stackKeys) {
  const raw = await fs.readFile(MAP_PATH, "utf8");
  const map = JSON.parse(raw);
  const ids = new Set();
  for (const key of stackKeys) {
    for (const id of (map[key] ?? [])) ids.add(id);
  }
  return [...ids];
}

// ─── Skill Installation ──────────────────────────────────────────────────────

/**
 * Install a list of skills.
 * For each skill:
 *   1. Try `npx skills add <id>` — installs from skills.sh registry
 *   2. Fall back to bundled builtin markdown file
 *   3. Write a placeholder if neither is available
 *
 * @param {string[]} skillIds  - e.g. ["vercel-labs/next-skills/next-best-practices"]
 * @param {string}   cwd       - project root
 */
export async function installSkills(skillIds, cwd) {
  if (!skillIds.length) return { installed: [], builtin: [], placeholder: [] };

  const result = { installed: [], builtin: [], placeholder: [] };
  const hasCli = await isSkillsCliAvailable();
  const spinner = ora(`Installing ${skillIds.length} skills...`).start();

  for (const id of skillIds) {
    spinner.text = `Installing ${chalk.cyan(id)}...`;

    if (hasCli) {
      // skills.sh CLI: `npx skills add owner/repo/skill-name`
      const r = runSkills(["add", id], cwd);
      if (r.ok) {
        result.installed.push(id);
        continue;
      }
      // CLI failed (likely network issue or skill moved) — try builtin
    }

    // Builtin fallback
    const builtinContent = await loadBuiltin(id);
    if (builtinContent) {
      await writeLocalSkill(id, builtinContent, cwd);
      result.builtin.push(id);
      continue;
    }

    // Placeholder
    await writeLocalSkill(id, buildPlaceholder(id), cwd);
    result.placeholder.push(id);
  }

  const parts = [];
  if (result.installed.length)   parts.push(`${result.installed.length} from skills.sh`);
  if (result.builtin.length)     parts.push(`${result.builtin.length} builtin`);
  if (result.placeholder.length) parts.push(`${result.placeholder.length} placeholder`);

  spinner.succeed(`Skills ready: ${parts.join(" · ")}`);

  if (!hasCli && skillIds.length > 0) {
    console.log(chalk.dim("  Note: skills.sh CLI not available — builtins/placeholders used."));
    console.log(chalk.dim("  Install: npm install -g skills  (or npx skills will auto-install)"));
  }

  return result;
}

/**
 * Install a single skill manually.
 * @param {string} skillId
 * @param {string} cwd
 * @param {Object} cfg - .persistent.json config (for updating agent context)
 */
export async function addSkill(skillId, cwd, cfg) {
  const hasCli = await isSkillsCliAvailable();

  if (hasCli) {
    console.log(chalk.dim(`  npx skills add ${skillId}`));
    const r = runSkills(["add", skillId], cwd);
    if (r.ok) {
      console.log(chalk.green("✓") + ` Installed ${chalk.cyan(skillId)} (skills.sh)`);
      return;
    }
  }

  // Fallback
  const builtin = await loadBuiltin(skillId);
  if (builtin) {
    await writeLocalSkill(skillId, builtin, cwd);
    console.log(chalk.green("✓") + ` Installed ${chalk.cyan(skillId)} (builtin)`);
    return;
  }

  await writeLocalSkill(skillId, buildPlaceholder(skillId), cwd);
  console.log(chalk.yellow("⚠") + ` ${chalk.cyan(skillId)} — placeholder written (.skills/)`);
  console.log(chalk.dim("  Fill it in or install via: npx skills add " + skillId));
}

/**
 * Search skills.sh registry.
 * @param {string} query
 * @returns {Promise<Object[]>}
 */
export async function searchSkills(query) {
  const hasCli = await isSkillsCliAvailable();

  if (hasCli) {
    const r = captureSkills(["search", query], process.cwd());
    if (r.ok) return parseSearchOutput(r.stdout);
  }

  // Offline fallback — search skills-map keys
  const raw = await fs.readFile(MAP_PATH, "utf8").catch(() => "{}");
  const map = JSON.parse(raw);
  const q = query.toLowerCase();
  const results = [];

  for (const [stack, ids] of Object.entries(map)) {
    if (stack.includes(q)) {
      for (const id of ids) {
        const [owner, repo, skill] = id.split("/");
        results.push({ id, owner, repo, name: skill || repo, source: "skills-map" });
      }
    }
  }

  return results;
}

/**
 * Update all installed skills.
 * @param {string} cwd
 */
export async function updateSkills(cwd) {
  const hasCli = await isSkillsCliAvailable();

  if (hasCli) {
    console.log(chalk.dim("  Updating installed skills via skills.sh..."));
    runSkills(["update"], cwd);
    return;
  }

  console.log(chalk.yellow("⚠  skills.sh CLI not available — cannot update automatically."));
  console.log(chalk.dim("  Run: npx skills update"));
}

/**
 * Create a skill from Obsidian patterns and project code.
 * Writes a local skill file, optionally published to skills.sh.
 *
 * @param {string}   skillId       - e.g. "myteam/my-skills/auth-patterns"
 * @param {string}   cwd
 * @param {Object}   opts
 * @param {Object[]} opts.obsidianNotes - Notes tagged #pattern or #skill
 * @param {string[]} opts.stack
 * @param {Object}   opts.cliAI   - CLI's native AI for generation
 */
export async function createSkillFromProject(skillId, cwd, opts = {}) {
  const obsidianContent = formatObsidianPatterns(opts.obsidianNotes || [], skillId);
  let skillContent;

  if (opts.cliAI) {
    const prompt = buildSkillGenPrompt(skillId, obsidianContent, opts.stack || []);
    try {
      const r = await opts.cliAI.generate({ prompt, maxTokens: 1500, temperature: 0 });
      skillContent = r.text;
    } catch {
      skillContent = buildSkillTemplate(skillId, obsidianContent);
    }
  } else {
    skillContent = buildSkillTemplate(skillId, obsidianContent);
  }

  await writeLocalSkill(skillId, skillContent, cwd);

  const hasCli = await isSkillsCliAvailable();
  if (hasCli) {
    console.log(chalk.dim("  To publish to skills.sh: npx skills publish " + skillId));
  }

  console.log(chalk.green("✓") + ` Skill created: ${chalk.cyan(skillId)} → .skills/`);
  return { success: true };
}

/**
 * Evolve an existing skill with new patterns.
 * @param {string}   skillId
 * @param {string}   cwd
 * @param {Object}   opts
 * @param {Object[]} opts.newPatterns - new patterns to add
 * @param {Object}   opts.cliAI
 */
export async function evolveSkill(skillId, cwd, opts = {}) {
  const skillPath = path.join(cwd, skillIdToPath(skillId));
  let current;
  try { current = await fs.readFile(skillPath, "utf8"); }
  catch {
    console.log(chalk.red(`✗ Skill not found: ${skillId}`));
    console.log(chalk.dim("  Run: persistent skill --create " + skillId));
    return { success: false };
  }

  const patterns = opts.newPatterns || [];
  if (!patterns.length) {
    console.log(chalk.dim("  No new patterns to add."));
    return { success: true, changed: false };
  }

  const addition = `\n\n## Updated Patterns (${new Date().toISOString().slice(0, 10)})\n${patterns.map((p) => `- ${typeof p === "string" ? p : p.title || p.content || p}`).join("\n")}\n`;
  await fs.writeFile(skillPath, current + addition, "utf8");
  console.log(chalk.green("✓") + ` Skill evolved: ${chalk.cyan(skillId)} (+${patterns.length} patterns)`);
  return { success: true, changed: true };
}

/**
 * List installed skills.
 * @param {string} cwd
 */
export async function listInstalledSkills(cwd) {
  const hasCli = await isSkillsCliAvailable();

  // Try skills.sh CLI first
  if (hasCli) {
    const r = captureSkills(["list"], cwd);
    if (r.ok) {
      const results = parseSearchOutput(r.stdout);
      if (results.length) return results;
    }
  }

  // Fallback: scan .skills/ directory
  const skillsDir = path.join(cwd, SKILLS_DIR);
  const skills = [];
  try {
    const owners = await fs.readdir(skillsDir, { withFileTypes: true });
    for (const owner of owners) {
      if (!owner.isDirectory()) continue;
      const ownerDir = path.join(skillsDir, owner.name);
      const files = await fs.readdir(ownerDir).catch(() => []);
      for (const file of files) {
        if (!file.endsWith(".md")) continue;
        const stat = await fs.stat(path.join(ownerDir, file)).catch(() => null);
        skills.push({
          id:       `${owner.name}/${file.replace(".md", "")}`,
          owner:    owner.name,
          name:     file.replace(".md", ""),
          source:   "local",
          version:  stat ? stat.mtime.toISOString().slice(0, 10) : "?",
        });
      }
    }
  } catch { /* .skills not created yet */ }

  return skills;
}

/**
 * Extract skill-worthy patterns from Obsidian notes.
 * Notes tagged #pattern, #skill, #best-practice, #convention.
 * @param {Object[]} notes
 * @returns {Object[]}
 */
export function extractSkillCandidates(notes) {
  if (!notes?.length) return [];

  const candidates = [];
  const skillTags = new Set(["pattern", "skill", "best-practice", "convention"]);

  for (const note of notes) {
    const tags = (note.tags || []).map((t) => t.replace("#", "").toLowerCase());
    if (!tags.some((t) => skillTags.has(t))) continue;

    const lines = (note.content || "").split("\n");
    for (const line of lines) {
      if ((line.startsWith("- ") || line.startsWith("* ")) && line.length > 12) {
        candidates.push({
          title:   line.slice(2, 82).trim(),
          content: line.slice(2).trim(),
          source:  note.rel || "obsidian",
        });
      }
    }
  }

  return candidates;
}

// ─── Filesystem helpers ──────────────────────────────────────────────────────

function skillIdToPath(id) {
  // owner/repo/skill-name → .skills/owner/repo--skill-name.md
  // owner/repo → .skills/owner/repo.md
  const parts = id.split("/");
  if (parts.length === 3) {
    const [owner, repo, skill] = parts;
    return path.join(SKILLS_DIR, owner, `${repo}--${skill}.md`);
  }
  if (parts.length === 2) {
    const [owner, name] = parts;
    return path.join(SKILLS_DIR, owner, `${name}.md`);
  }
  return path.join(SKILLS_DIR, `${id}.md`);
}

async function writeLocalSkill(id, content, cwd) {
  const fullPath = path.join(cwd, skillIdToPath(id));
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, content, "utf8");
}

async function loadBuiltin(id) {
  // Try exact match first: owner__repo--skill.md
  const candidates = [
    path.join(BUILTIN_DIR, id.replace(/\//g, "__") + ".md"),
    path.join(BUILTIN_DIR, id.split("/").pop() + ".md"),
  ];
  for (const p of candidates) {
    try { return await fs.readFile(p, "utf8"); } catch {}
  }
  return null;
}

function buildPlaceholder(id) {
  const name = id.split("/").pop();
  return `# ${id}

> Skill from skills.sh registry.
> Install: \`npx skills add ${id}\`

## Patterns
<!-- Add best practices for ${name} here -->
<!-- This file is read by your AI agent as context -->

## Anti-Patterns
<!-- What NOT to do -->

## References
- https://skills.sh/${id.split("/").slice(0, 2).join("/")}
`;
}

function buildSkillTemplate(id, obsidianContent) {
  const name = id.split("/").pop();
  return `# ${id}

> Generated by persistent from project patterns + Obsidian notes.
> Evolve: \`persistent skill --evolve ${id}\`

## Patterns
${obsidianContent || `<!-- Add patterns for ${name} here -->`}

## Anti-Patterns
<!-- What NOT to do -->

## Examples
<!-- Code examples showing correct usage -->

## References
- https://skills.sh/${id.split("/").slice(0, 2).join("/")}
`;
}

function buildSkillGenPrompt(id, obsidianContent, stack) {
  return `Generate a skills.sh skill file for: ${id}

STACK: ${stack.join(", ")}

OBSIDIAN PATTERNS (from user's knowledge vault):
${obsidianContent || "No relevant notes."}

Create a skill markdown file with:
1. Header with skill name and brief description
2. ## Patterns — best practices (specific, actionable)
3. ## Anti-Patterns — what to avoid
4. ## Examples — short code snippets
5. ## References — links

Be specific to the stack. Use code blocks for examples.`;
}

function formatObsidianPatterns(notes, skillId) {
  const name = skillId.split("/").pop();
  const relevant = notes.filter((n) => {
    const c = (n.content || "").toLowerCase();
    return c.includes(name.toLowerCase()) || c.includes("#pattern") || c.includes("#skill");
  });

  return relevant
    .slice(0, 5)
    .map((n) => {
      const preview = (n.content || "").split("\n").slice(0, 8).join("\n");
      return `### ${n.rel || "note"}\n${preview}`;
    })
    .join("\n\n");
}

function parseSearchOutput(stdout) {
  const results = [];
  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    // Format varies: "owner/repo/skill  —  description" or just "owner/repo/skill"
    const match = trimmed.match(/^([\w-]+\/[\w-]+(?:\/[\w-]+)?)\s*(?:[-—]\s*(.*))?$/);
    if (match) {
      const [, id, description] = match;
      const parts = id.split("/");
      results.push({
        id,
        owner:       parts[0],
        repo:        parts[1],
        name:        parts[2] || parts[1],
        description: (description || "").trim(),
      });
    }
  }
  return results;
}

// Re-export for backward compat
export { searchSkills, updateSkills, createSkillFromProject, evolveSkill, listInstalledSkills, extractSkillCandidates };
export async function discoverSkills(stackKeys, cwd) {
  const mapped = await resolveSkills(stackKeys);
  return { mapped, discovered: [] };
}
