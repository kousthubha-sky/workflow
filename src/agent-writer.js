/**
 * agent-writer.js
 * Detects which AI agent is active in the project.
 * Writes or patches the agent's context file (CLAUDE.md, agents.md, etc.)
 * with an [specflow] block containing the context-dense summary.
 *
 * Design rules:
 *  - Never clobber existing agent file content
 *  - Idempotent: re-running replaces only the [specflow] block
 *  - Walks UP from cwd to find agent markers (monorepo-aware)
 *  - Supports all major agents — see AGENT_FILE_MAP
 */

import fs from "fs/promises";
import path from "path";
import chalk from "chalk";

/** Map agent id → integration file path relative to project/agent root */
export const AGENT_FILE_MAP = {
  "claude-code": "CLAUDE.md",
  "opencode":    "agents.md",
  "copilot":     ".github/copilot-instructions.md",
  "cursor":      ".cursor/rules/specflow.mdc",
  "aider":       ".aider/context.md",
  "windsurf":    ".windsurfrules",
  "continue":    ".continue/context.md",
  "generic":     "AGENT_CONTEXT.md",
};

const BLOCK_START = "<!-- specflow:start -->";
const BLOCK_END   = "<!-- specflow:end -->";

// Agent marker files — presence identifies the agent
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

/**
 * Walk UP the directory tree from startDir to find agent marker files.
 * Monorepo-aware: running from frontend/ finds CLAUDE.md at repo root.
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
    const parent = path.dirname(dir);
    if (parent === dir || dir === fsRoot) break;
    dir = parent;
  }

  return { agent: "generic", root: startDir };
}

/**
 * Build the specflow context block — context-dense, low token.
 */
export function buildBlock(cfg) {
  const stack      = (cfg.stack   ?? []).join("|") || "unknown";
  const skills     = (cfg.skills  ?? []).join(",") || "none";
  const activeSpec = cfg.activeSpec   ?? "none";
  const lastSync   = cfg.lastSync     ? cfg.lastSync.slice(0, 10) : "never";
  const obsidian   = cfg.obsidianPath ?? "not-configured";
  const agents     = (cfg.agents  ?? [cfg.agent]).filter(Boolean).join(",");

  return `${BLOCK_START}
# specflow-ctx
> stack:${stack}
> agents:[${agents}]
> skills:[${skills}]
> sdd:enabled · spec:${activeSpec}
> memory-sync:${lastSync}

## constraints
- follow SPECS/SEED.md patterns and anti-patterns
- check MEMORY/INDEX.md before starting long tasks
- new features: run \`specflow spec "<feature>"\` first

## sdd-cycle
propose → apply → archive (specs in SPECS/)

## skills
.skills/ — one markdown file per library, read as context

## obsidian
vault:${obsidian}
sync: \`specflow sync\`
${BLOCK_END}`;
}

/**
 * Write or patch an agent's integration file.
 * Idempotent — replaces only the specflow block, preserves everything else.
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
    const startIdx = existing.indexOf(BLOCK_START);
    const endIdx   = existing.indexOf(BLOCK_END) + BLOCK_END.length;
    updated = existing.slice(0, startIdx) + block + existing.slice(endIdx);
  } else if (existing.length > 0) {
    updated = block + "\n\n" + existing;
  } else {
    updated = block;
  }

  await fs.writeFile(fullPath, updated, "utf8");
  return { relPath, fullPath, block };
}

/**
 * Update all configured agents (multi-agent support).
 * Replaces old single updateAgent() call.
 */
export async function updateAgent(cfg, forceAgent, opts = {}) {
  const cwd = process.cwd();

  let targets; // [{ agentId, agentRoot }]

  if (forceAgent) {
    targets = [{ agentId: forceAgent, agentRoot: opts.agentRoot ?? cwd }];
  } else if (cfg.agents?.length) {
    // Multi-agent: patch each one
    targets = cfg.agents.map((id) => ({
      agentId:   id,
      agentRoot: cfg.agentRoot ?? cwd,
    }));
  } else if (cfg.agent) {
    targets = [{ agentId: cfg.agent, agentRoot: cfg.agentRoot ?? cwd }];
  } else {
    const { agent, root } = await detectAgent(cwd);
    targets = [{ agentId: agent, agentRoot: root }];
  }

  for (const { agentId, agentRoot } of targets) {
    const relPath      = AGENT_FILE_MAP[agentId] ?? AGENT_FILE_MAP.generic;
    const displayPath  = path.relative(cwd, path.join(agentRoot, relPath)) || relPath;
    const { block }    = await patchAgentFile(agentId, agentRoot, cfg);
    console.log(chalk.green("✓") + ` Patched ${chalk.bold(displayPath)} [${chalk.cyan(agentId)}]`);
  }
}

/**
 * Write AGENT_CONTEXT.md — universal source of truth in cwd.
 */
export async function writeAgentContext(cfg, cwd) {
  const block    = buildBlock(cfg);
  const fullPath = path.join(cwd, "AGENT_CONTEXT.md");
  await fs.writeFile(fullPath, block, "utf8");
  console.log(chalk.green("✓") + " Wrote AGENT_CONTEXT.md");
}
