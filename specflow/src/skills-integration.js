/**
 * skills-integration.js
 *
 * Integration with skills.sh — the open agent skills registry.
 *
 * Install strategy (in order):
 *   1. Try `npx skills add <pkg>` — uses skills.sh registry (output suppressed)
 *   2. Fall back to built-in markdown files bundled with persistent
 *   3. If neither — write a minimal placeholder
 */

import { execSync, spawnSync } from "child_process";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";
import ora from "ora";
import { glob } from "glob";

const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const MAP_PATH    = path.join(__dirname, "../config/skills-map.json");
const BUILTIN_DIR = path.join(__dirname, "../config/builtin-skills");
const SKILLS_DIR  = ".skills";

// ─── skills.sh CLI ──────────────────────────────────────────────────────────

let _cliAvailable = null;

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
 * Run `npx skills <args>` silently — capture output instead of streaming.
 * This prevents the "No valid skills found" / "No skills found" messages
 * from skills.sh flooding the terminal when repos lack SKILL.md files.
 * We only surface errors if the caller needs them.
 *
 * @param {string[]} args
 * @param {string}   cwd
 * @returns {{ ok: boolean, stdout: string, stderr: string }}
 */
function runSkills(args, cwd) {
  const result = spawnSync("npx", ["--yes", "skills", ...args], {
    cwd,
    stdio: "pipe",   // ← suppressed: skills.sh outputs noise on missing SKILL.md
    timeout: 60_000,
    shell: process.platform === "win32",
  });
  return {
    ok: result.status === 0,
    stdout: result.stdout?.toString() ?? "",
    stderr: result.stderr?.toString() ?? "",
  };
}

/**
 * Run `npx skills <args>` and capture stdout for parsing (search, list).
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
 * Tries skills.sh CLI silently, falls back to builtins, then placeholders.
 * Only shows a clean summary — never raw skills.sh output.
 */
export async function installSkills(skillIds, cwd) {
  if (!skillIds.length) return { installed: [], builtin: [], placeholder: [] };

  const result = { installed: [], builtin: [], placeholder: [] };
  const hasCli = await isSkillsCliAvailable();
  const spinner = ora(`Installing ${skillIds.length} skills...`).start();

  for (const id of skillIds) {
    spinner.text = `Installing ${chalk.cyan(id)}...`;

    if (hasCli) {
      // Run silently — skills.sh emits "No valid skills found" when repos lack
      // SKILL.md, but our builtin fallback handles these cases correctly.
      const r = runSkills(["add", id], cwd);
      if (r.ok) {
        result.installed.push(id);
        continue;
      }
      // CLI failed or repo had no SKILL.md → fall through to builtin
    }

    // Builtin fallback (bundled markdown files in config/builtin-skills/)
    const builtinContent = await loadBuiltin(id);
    if (builtinContent) {
      await writeLocalSkill(id, builtinContent, cwd);
      result.builtin.push(id);
      continue;
    }

    // Placeholder — user can fill in or install via npx skills later
    await writeLocalSkill(id, buildPlaceholder(id), cwd);
    result.placeholder.push(id);
  }

  const parts = [];
  if (result.installed.length)   parts.push(`${result.installed.length} registry`);
  if (result.builtin.length)     parts.push(`${result.builtin.length} builtin`);
  if (result.placeholder.length) parts.push(`${result.placeholder.length} placeholder`);

  spinner.succeed(`Skills ready: ${parts.join(" · ")}`);
  return result;
}

/**
 * Install a single skill manually (persistent add-skill <id>).
 */
export async function addSkill(skillId, cwd, cfg) {
  const hasCli = await isSkillsCliAvailable();

  if (hasCli) {
    const r = runSkills(["add", skillId], cwd);
    if (r.ok) {
      console.log(chalk.green("✓") + ` Installed ${chalk.cyan(skillId)} (skills.sh registry)`);
      return;
    }
  }

  const builtin = await loadBuiltin(skillId);
  if (builtin) {
    await writeLocalSkill(skillId, builtin, cwd);
    console.log(chalk.green("✓") + ` Installed ${chalk.cyan(skillId)} (builtin)`);
    return;
  }

  await writeLocalSkill(skillId, buildPlaceholder(skillId), cwd);
  console.log(chalk.yellow("⚠") + ` ${chalk.cyan(skillId)} — placeholder written`);
  console.log(chalk.dim("  Fill it in or install via: npx skills add " + skillId));
}

/**
 * Search skills.sh registry.
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
 */
export async function updateSkills(cwd) {
  const hasCli = await isSkillsCliAvailable();

  if (hasCli) {
    console.log(chalk.dim("  Updating installed skills via skills.sh..."));
    runSkills(["update"], cwd);
    return;
  }

  console.log(chalk.yellow("⚠  skills.sh CLI not available."));
  console.log(chalk.dim("  Run: npx skills update"));
}

/**
 * Create a skill from Obsidian patterns and project code.
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
 */
export async function listInstalledSkills(cwd) {
  const hasCli = await isSkillsCliAvailable();

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
          id:      `${owner.name}/${file.replace(".md", "")}`,
          owner:   owner.name,
          name:    file.replace(".md", ""),
          source:  "local",
          version: stat ? stat.mtime.toISOString().slice(0, 10) : "?",
        });
      }
    }
  } catch {}

  return skills;
}

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
  // Try multiple name patterns to find a matching builtin skill file
  const lastPart = id.split("/").pop();
  const candidates = [
    path.join(BUILTIN_DIR, id.replace(/\//g, "__") + ".md"),   // full id with __
    path.join(BUILTIN_DIR, lastPart + ".md"),                   // last segment
  ];

  // Also try matching by stack key: look up which stack key maps to this skill id
  // This allows builtin files named "nextjs.md" to match skill id "vercel-labs/next-skills/next-best-practices"
  try {
    const raw = await fs.readFile(MAP_PATH, "utf8");
    const map = JSON.parse(raw);
    for (const [stackKey, ids] of Object.entries(map)) {
      if (ids.includes(id)) {
        candidates.push(path.join(BUILTIN_DIR, stackKey + ".md"));
      }
    }
  } catch {}

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

export async function discoverSkills(stackKeys, cwd) {
  const mapped = await resolveSkills(stackKeys);
  return { mapped, discovered: [] };
}