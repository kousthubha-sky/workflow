/**
 * agent-writer.js
 * Detects which AI agent is active in the project.
 * Writes or patches the agent's context file (CLAUDE.md, agents.md, etc.)
 * with an [agentflow] block containing the context-dense summary.
 *
 * Design rules:
 *  - Never clobber existing agent file content
 *  - Idempotent: re-running replaces only the [agentflow] block
 *  - Walks UP from cwd to find agent markers (monorepo-aware)
 *  - Supports: claude-code, opencode, copilot, cursor, aider, generic
 */

import fs from "fs/promises";
import path from "path";
import chalk from "chalk";

/** Map agent id → file path relative to project root */
export const AGENT_FILE_MAP = {
  "claude-code": "CLAUDE.md",
  opencode:      "agents.md",
  copilot:       ".github/copilot-instructions.md",
  cursor:        ".cursor/rules/agentflow.mdc",
  aider:         ".aider/context.md",
  generic:       "AGENT_CONTEXT.md",
};

const BLOCK_START = "<!-- agentflow:start -->";
const BLOCK_END   = "<!-- agentflow:end -->";

// Agent marker files — presence of any of these identifies the agent
const AGENT_MARKERS = [
  { file: "CLAUDE.md",                         agent: "claude-code" },
  { file: ".claude",                            agent: "claude-code" },
  { file: ".claude/settings.json",              agent: "claude-code" },
  { file: "agents.md",                          agent: "opencode"    },
  { file: ".opencode",                          agent: "opencode"    },
  { file: ".github/copilot-instructions.md",    agent: "copilot"     },
  { file: ".cursor",                            agent: "cursor"      },
  { file: ".cursor/rules",                      agent: "cursor"      },
  { file: ".aider.conf.yml",                    agent: "aider"       },
];

/**
 * Walk UP the directory tree from cwd looking for agent marker files.
 * This handles monorepos where CLAUDE.md is at the root but you run
 * agentflow from a subdirectory (e.g. frontend/).
 *
 * @param {string} startDir
 * @returns {Promise<{ agent: string, root: string }>}
 *   agent = detected agent id
 *   root  = directory where the marker was found (use for writing agent file)
 */
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

    // Stop at filesystem root
    const parent = path.dirname(dir);
    if (parent === dir || dir === fsRoot) break;
    dir = parent;
  }

  // No marker found — use cwd as root, generic agent
  return { agent: "generic", root: startDir };
}

/**
 * Build the [agentflow] block content from config.
 * Context-dense, low token, machine-parseable.
 * @param {import('./config.js').AgentflowConfig} cfg
 * @returns {string}
 */
export function buildBlock(cfg) {
  const stack      = (cfg.stack   ?? []).join("|") || "unknown";
  const skills     = (cfg.skills  ?? []).join(",") || "none";
  const activeSpec = cfg.activeSpec  ?? "none";
  const lastSync   = cfg.lastSync    ? cfg.lastSync.slice(0, 10) : "never";
  const obsidian   = cfg.obsidianPath ?? "not-configured";

  return `${BLOCK_START}
# agentflow-ctx
> stack:${stack}
> skills:[${skills}]
> sdd:enabled · spec:${activeSpec}
> memory-sync:${lastSync}

## constraints
- follow SPECS/SEED.md patterns and anti-patterns
- check MEMORY/INDEX.md before starting long tasks
- new features: run \`agentflow spec "<feature>"\` first

## sdd-cycle
propose → apply → archive (specs live in SPECS/)

## skills
installed in .skills/ — each file is a best-practices guide for one lib

## obsidian
vault:${obsidian}
sync: \`agentflow sync\`
${BLOCK_END}`;
}

/**
 * Write or patch the agent's context file.
 * Writes to the agent root (where the marker was found), not necessarily cwd.
 *
 * @param {import('./config.js').AgentflowConfig} cfg
 * @param {string} [forceAgent] - Override detected agent id
 * @param {{ dryRun?: boolean, agentRoot?: string }} [opts]
 */
export async function updateAgent(cfg, forceAgent, opts = {}) {
  const cwd = process.cwd();

  // Determine agent id + root dir
  let agentId, agentRoot;
  if (forceAgent) {
    agentId   = forceAgent;
    agentRoot = opts.agentRoot ?? cwd;
  } else if (cfg.agent && cfg.agentRoot) {
    agentId   = cfg.agent;
    agentRoot = cfg.agentRoot;
  } else {
    ({ agent: agentId, root: agentRoot } = await detectAgent(cwd));
  }

  const relPath  = AGENT_FILE_MAP[agentId] ?? AGENT_FILE_MAP.generic;
  const fullPath = path.join(agentRoot, relPath);
  const block    = buildBlock(cfg);

  if (opts.dryRun) {
    const displayPath = path.relative(cwd, fullPath) || relPath;
    console.log(chalk.dim(`  [dry-run] Would patch: ${displayPath}`));
    return { agentId, agentRoot, relPath };
  }

  // Ensure parent dir exists
  await fs.mkdir(path.dirname(fullPath), { recursive: true });

  let existing = "";
  try {
    existing = await fs.readFile(fullPath, "utf8");
  } catch {}

  let updated;
  if (existing.includes(BLOCK_START)) {
    // Replace existing block (idempotent)
    const startIdx = existing.indexOf(BLOCK_START);
    const endIdx   = existing.indexOf(BLOCK_END) + BLOCK_END.length;
    updated = existing.slice(0, startIdx) + block + existing.slice(endIdx);
  } else if (existing.length > 0) {
    // Prepend to existing file content
    updated = block + "\n\n" + existing;
  } else {
    updated = block;
  }

  await fs.writeFile(fullPath, updated, "utf8");
  const displayPath = path.relative(cwd, fullPath) || relPath;
  console.log(chalk.green(`✓`) + ` Patched ${chalk.bold(displayPath)} [${chalk.cyan(agentId)}]`);
  return { agentId, agentRoot, relPath };
}

/**
 * Write AGENT_CONTEXT.md in the cwd (always — universal source of truth).
 * For non-generic agents this is a supplementary file; the agent file is
 * written separately by updateAgent().
 *
 * @param {import('./config.js').AgentflowConfig} cfg
 * @param {string} cwd
 * @param {{ dryRun?: boolean }} [opts]
 */
export async function writeAgentContext(cfg, cwd, opts = {}) {
  const fullPath = path.join(cwd, "AGENT_CONTEXT.md");
  const block    = buildBlock(cfg);

  if (opts.dryRun) return; // init.js handles dry-run display

  await fs.writeFile(fullPath, block, "utf8");
  console.log(chalk.green(`✓`) + " Wrote AGENT_CONTEXT.md");
}
