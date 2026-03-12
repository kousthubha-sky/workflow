/**
 * agent-writer.js
 * Detects which AI agent is active and writes/patches its context file.
 *
 * Design rules:
 *  - Idempotent: re-running replaces ONLY the persistent block, never the whole file
 *  - Sentinel blocks: <!-- persistent:start --> / <!-- persistent:end -->
 *  - Walks UP from cwd to find agent markers (monorepo-aware)
 *  - Supports all major agents — see AGENT_FILE_MAP
 */

import fs from "fs/promises";
import path from "path";
import chalk from "chalk";

export const AGENT_FILE_MAP = {
  "claude-code": "CLAUDE.md",
  "opencode":    "agents.md",
  "copilot":     ".github/copilot-instructions.md",
  "cursor":      ".cursor/rules/persistent.mdc",
  "aider":       ".aider/context.md",
  "windsurf":    ".windsurfrules",
  "continue":    ".continue/context.md",
  "generic":     "AGENT_CONTEXT.md",
};

const BLOCK_START = "<!-- persistent:start -->";
const BLOCK_END   = "<!-- persistent:end -->";

const AGENT_MARKERS = [
  { file: "CLAUDE.md",                         agent: "claude-code" },
  { file: ".claude",                            agent: "claude-code" },
  { file: ".claude/settings.json",              agent: "claude-code" },
  { file: "agents.md",                          agent: "opencode"    },
  { file: ".opencode",                          agent: "opencode"    },
  { file: ".github/copilot-instructions.md",    agent: "copilot"     },
  { file: ".cursor",                            agent: "cursor"      },
  { file: ".cursor/rules",                      agent: "cursor"      },
  { file: ".windsurfrules",                     agent: "windsurf"    },
  { file: ".continue",                          agent: "continue"    },
  { file: ".aider.conf.yml",                    agent: "aider"       },
];

export async function detectAgent(startDir) {
  let dir = path.resolve(startDir);
  const fsRoot = path.parse(dir).root;

  while (true) {
    for (const { file, agent } of AGENT_MARKERS) {
      try {
        await fs.access(path.join(dir, file));
        return { agent, root: dir };
      } catch {}
    }
    const parent = path.dirname(dir);
    if (parent === dir || dir === fsRoot) break;
    dir = parent;
  }

  return { agent: "generic", root: startDir };
}

export async function detectAgentWithEnv(startDir) {
  const env = process.env;
  if (env.OPENCODE === "1" || env.OPENCODE === "true")
    return { agent: "opencode", root: startDir };
  if (env.CLAUDE === "1" || env.CLAUDE === "true" || env.CLAUDE_API_KEY)
    return { agent: "claude-code", root: startDir };
  if (env.CURSOR === "1" || env.CURSOR === "true")
    return { agent: "cursor", root: startDir };
  if (env.WINDSURF === "1" || env.WINDSURF === "true")
    return { agent: "windsurf", root: startDir };
  if (env.COPILOT === "1" || env.COPILOT === "true")
    return { agent: "copilot", root: startDir };
  if (env.AIDER === "1" || env.AIDER === "true")
    return { agent: "aider", root: startDir };
  if (env.CONTINUE === "1" || env.CONTINUE === "true")
    return { agent: "continue", root: startDir };
  return detectAgent(startDir);
}

/**
 * Build the persistent context block injected into the agent file.
 *
 * References the REAL tools:
 *   - openspec/    ← owned by @fission-ai/openspec CLI
 *   - .skills/     ← owned by skills.sh CLI
 *   - MEMORY/      ← synced from Obsidian vault by persistent
 *   - SPECS/SEED.md ← persistent's architectural DNA layer
 */
export function buildBlock(cfg) {
  const stack     = (cfg.stack   ?? []).join("|") || "unknown";
  const skills    = (cfg.skills  ?? []).join(",") || "none";
  const lastSync  = cfg.lastSync ? cfg.lastSync.slice(0, 10) : "never";
  const obsidian  = cfg.obsidianPath ?? "not-configured";
  const agents    = (cfg.agents ?? [cfg.agent]).filter(Boolean).join(",");

  return `${BLOCK_START}
# persistent-ctx
> stack:${stack}
> agents:[${agents}]
> skills:[${skills}]
> obsidian-sync:${lastSync}

## context-files (read before every task)
| file | purpose |
|------|---------|
| \`MEMORY/INDEX.md\` | Hot notes from Obsidian vault — personal context |
| \`SPECS/SEED.md\` | Architectural DNA — patterns, anti-patterns, constraints |
| \`.skills/\` | Skills from skills.sh — one file per library |
| \`openspec/specs/\` | Living requirements (managed by OpenSpec) |
| \`openspec/changes/\` | Proposed + active changes (managed by OpenSpec) |

## workflow
Before starting any feature:
1. Run \`persistent sync\` — refresh Obsidian context
2. Read \`MEMORY/INDEX.md\` — check hot notes
3. Read \`SPECS/SEED.md\` — respect patterns and constraints
4. Use \`/opsx:new "feature"\` in your agent — create an OpenSpec change
5. Use \`/opsx:ff\` — generate proposal + design + tasks
6. Use \`/opsx:apply\` — implement
7. Use \`/opsx:archive\` — archive when done

## skills-sh
.skills/ contains context from skills.sh registry.
Add skills: \`persistent add-skill owner/repo/skill-name\`
Search:     \`persistent skill --search <query>\`

## obsidian
vault:${obsidian}
refresh: \`persistent sync\`
tag notes #spec → OpenSpec context
tag notes #decision → SEED.md
tag notes #pattern → skills creation
tag notes #persistent → always in MEMORY/INDEX.md
${BLOCK_END}`;
}

/**
 * Write or patch the agent's context file.
 * Replaces ONLY the persistent block — preserves all existing content.
 * Idempotent: safe to re-run any number of times.
 */
export async function patchAgentFile(agentId, agentRoot, cfg) {
  const relPath  = AGENT_FILE_MAP[agentId] ?? AGENT_FILE_MAP.generic;
  const fullPath = path.join(agentRoot, relPath);
  const block    = buildBlock(cfg);

  await fs.mkdir(path.dirname(fullPath), { recursive: true });

  let existing = "";
  try { existing = await fs.readFile(fullPath, "utf8"); } catch {}

  let updated;
  if (existing.includes(BLOCK_START)) {
    // Replace existing block — leave everything outside it untouched
    const startIdx = existing.indexOf(BLOCK_START);
    const endIdx   = existing.indexOf(BLOCK_END) + BLOCK_END.length;
    updated = existing.slice(0, startIdx) + block + existing.slice(endIdx);
  } else if (existing.trim().length > 0) {
    // Prepend block — keep existing content below
    updated = block + "\n\n" + existing;
  } else {
    updated = block;
  }

  await fs.writeFile(fullPath, updated, "utf8");
  return { relPath, fullPath, block };
}

export async function updateAgent(cfg, forceAgent, opts = {}) {
  const cwd = process.cwd();
  let targets;

  if (forceAgent) {
    targets = [{ agentId: forceAgent, agentRoot: opts.agentRoot ?? cwd }];
  } else if (cfg.agents?.length) {
    targets = cfg.agents.map((id) => ({ agentId: id, agentRoot: cfg.agentRoot ?? cwd }));
  } else if (cfg.agent) {
    targets = [{ agentId: cfg.agent, agentRoot: cfg.agentRoot ?? cwd }];
  } else {
    const { agent, root } = await detectAgent(cwd);
    targets = [{ agentId: agent, agentRoot: root }];
  }

  for (const { agentId, agentRoot } of targets) {
    const relPath     = AGENT_FILE_MAP[agentId] ?? AGENT_FILE_MAP.generic;
    const displayPath = path.relative(cwd, path.join(agentRoot, relPath)) || relPath;
    await patchAgentFile(agentId, agentRoot, cfg);
    console.log(chalk.green("✓") + ` Patched ${chalk.bold(displayPath)} [${chalk.cyan(agentId)}]`);
  }
}

export async function writeAgentContext(cfg, cwd) {
  const block    = buildBlock(cfg);
  const fullPath = path.join(cwd, "AGENT_CONTEXT.md");
  await fs.writeFile(fullPath, block, "utf8");
  console.log(chalk.green("✓") + " Wrote AGENT_CONTEXT.md");
}
