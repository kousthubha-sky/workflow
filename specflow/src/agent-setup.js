/**
 * agent-setup.js
 * Per-agent setup instructions and integration logic.
 *
 * Each agent has:
 *   - how it reads context (file it watches)
 *   - what specflow writes to hook into it
 *   - any extra steps needed (extensions, settings, etc.)
 *
 * specflow does NOT install extensions automatically —
 * it writes the right files and tells the user exactly what to do.
 */

import fs from "fs/promises";
import path from "path";
import chalk from "chalk";
import { execSync } from "child_process";
import { writeSlashCommands } from "./command-writer.js";

/**
 * Agent registry — everything we know about each agent's integration.
 *
 * integrationFile: the file the agent reads for project context
 * detect:          files/dirs that indicate this agent is already in use
 * setup:           async function that does any extra work beyond writing integrationFile
 * postSetupSteps:  printed instructions after setup (things we can't automate)
 */
export const AGENTS = {
  "claude-code": {
    label:           "Claude Code",
    integrationFile: "CLAUDE.md",
    detect:          ["CLAUDE.md", ".claude", ".claude/settings.json"],
    setup:           setupClaudeCode,
    postSetupSteps: [
      "Open Claude Code in this project — it reads CLAUDE.md automatically on every session",
      "No extension or plugin needed — CLAUDE.md is native to Claude Code",
      "Type /specflow- to see all specflow slash commands in Claude Code chat",
      "Tag notes #specflow in Obsidian, then run: specflow sync",
    ],
  },

  "opencode": {
    label:           "OpenCode",
    integrationFile: "agents.md",
    detect:          ["agents.md", ".opencode"],
    setup:           setupOpenCode,
    postSetupSteps: [
      "OpenCode reads agents.md automatically — no extra config needed",
      "Type /specflow- to see all specflow slash commands in OpenCode chat",
      "Run: specflow update to re-sync after stack changes",
    ],
  },

  "copilot": {
    label:           "GitHub Copilot",
    integrationFile: ".github/copilot-instructions.md",
    detect:          [".github/copilot-instructions.md"],
    setup:           setupCopilot,
    postSetupSteps: [
      "Install GitHub Copilot extension in VS Code if not already installed",
      "copilot-instructions.md is read automatically by Copilot Chat in VS Code",
      "Requires Copilot Chat (not just base Copilot) — check your subscription includes it",
      "Restart VS Code after first setup",
    ],
  },

  "cursor": {
    label:           "Cursor",
    integrationFile: ".cursor/rules/specflow.mdc",
    detect:          [".cursor", ".cursor/rules"],
    setup:           setupCursor,
    postSetupSteps: [
      "Cursor reads .cursor/rules/*.mdc automatically — no extra config needed",
      "Open Cursor Settings → Features → Rules for AI to verify the rule is loaded",
      "Rules apply to all Cursor AI interactions in this project",
    ],
  },

  "aider": {
    label:           "Aider",
    integrationFile: ".aider/context.md",
    detect:          [".aider.conf.yml", ".aider"],
    setup:           setupAider,
    postSetupSteps: [
      "Add to your aider command: aider --read .aider/context.md",
      "Or add to .aider.conf.yml:  read: [.aider/context.md]",
      "Aider will include this file as context in every session",
    ],
  },

  "windsurf": {
    label:           "Windsurf (Codeium)",
    integrationFile: ".windsurfrules",
    detect:          [".windsurfrules"],
    setup:           setupWindsurf,
    postSetupSteps: [
      ".windsurfrules is read automatically by Windsurf's Cascade AI",
      "No extension needed — built into Windsurf editor",
      "Restart Windsurf after first setup to load the rules",
    ],
  },

  "continue": {
    label:           "Continue.dev",
    integrationFile: ".continue/context.md",
    detect:          [".continue", ".continuerc.json"],
    setup:           setupContinue,
    postSetupSteps: [
      "Install Continue extension in VS Code or JetBrains",
      "Continue reads .continue/ directory automatically",
      "Open Continue sidebar → verify context is loaded",
    ],
  },
};

// ─── Per-agent setup functions ──────────────────────────────────────────────

async function setupClaudeCode(agentRoot, block) {
  // Claude Code is already handled by agent-writer.js patchFile
  // Extra: create .claude/settings.json if it doesn't exist
  const settingsPath = path.join(agentRoot, ".claude", "settings.json");
  try {
    await fs.access(settingsPath);
  } catch {
    await fs.mkdir(path.join(agentRoot, ".claude"), { recursive: true });
    await fs.writeFile(settingsPath, JSON.stringify({
      "contextFiles": ["AGENT_CONTEXT.md", "SPECS/SEED.md"],
      "includeGlobs": [".skills/**/*.md", "SPECS/active/**/*.md", "MEMORY/INDEX.md"]
    }, null, 2));
    console.log(chalk.green("✓") + " Created .claude/settings.json with context file references");
  }

  // Write slash commands to .claude/commands/
  const result = await writeSlashCommands("claude-code", agentRoot);
  if (result.written.length > 0) {
    console.log(
      chalk.green("✓") +
      ` Created ${chalk.bold(result.written.length)} slash commands in ` +
      chalk.cyan(".claude/commands/")
    );
  }
}

async function setupOpenCode(agentRoot, block) {
  // agents.md handled by agent-writer.js
  // Write slash commands to .opencode/commands/
  const result = await writeSlashCommands("opencode", agentRoot);
  if (result.written.length > 0) {
    console.log(
      chalk.green("✓") +
      ` Created ${chalk.bold(result.written.length)} slash commands in ` +
      chalk.cyan(".opencode/commands/")
    );
  }
}

async function setupCopilot(agentRoot, block) {
  // copilot-instructions.md handled by agent-writer.js
  // Extra: check if VS Code workspace settings reference it
  const vscodePath = path.join(agentRoot, ".vscode");
  const settingsPath = path.join(vscodePath, "settings.json");

  let settings = {};
  try {
    const raw = await fs.readFile(settingsPath, "utf8");
    settings = JSON.parse(raw);
  } catch {}

  // Ensure Copilot Chat is enabled and instructions file is referenced
  let changed = false;
  if (!settings["github.copilot.chat.codeGeneration.instructions"]) {
    settings["github.copilot.chat.codeGeneration.instructions"] = [
      { "file": ".github/copilot-instructions.md" }
    ];
    changed = true;
  }

  if (changed) {
    await fs.mkdir(vscodePath, { recursive: true });
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
    console.log(chalk.green("✓") + " Updated .vscode/settings.json to reference copilot-instructions.md");
  }
}

async function setupCursor(agentRoot, block) {
  // .cursor/rules/specflow.mdc handled by agent-writer.js — nothing extra
}

async function setupAider(agentRoot, block) {
  // Write .aider.conf.yml if it doesn't exist
  const confPath = path.join(agentRoot, ".aider.conf.yml");
  try {
    await fs.access(confPath);
    // Already exists — don't overwrite, just note the manual step
  } catch {
    await fs.writeFile(confPath,
      `# Aider configuration — managed by specflow\nread:\n  - .aider/context.md\n  - AGENT_CONTEXT.md\n`
    );
    console.log(chalk.green("✓") + " Created .aider.conf.yml with context file references");
  }
}

async function setupWindsurf(agentRoot, block) {
  // .windsurfrules handled by agent-writer.js — nothing extra
}

async function setupContinue(agentRoot, block) {
  // Create .continue/config.json if not present
  const continuePath = path.join(agentRoot, ".continue");
  const configPath   = path.join(continuePath, "config.json");
  try {
    await fs.access(configPath);
  } catch {
    await fs.mkdir(continuePath, { recursive: true });
    await fs.writeFile(configPath, JSON.stringify({
      "contextProviders": [
        { "name": "file", "params": { "nRetrieve": 10 } }
      ],
      "docs": []
    }, null, 2));
    console.log(chalk.green("✓") + " Created .continue/config.json");
  }
}

/**
 * Run the extra setup step for a given agent after the integration file is written.
 * @param {string} agentId
 * @param {string} agentRoot
 * @param {string} block - the specflow context block content
 */
export async function runAgentSetup(agentId, agentRoot, block) {
  const agent = AGENTS[agentId];
  if (!agent?.setup) return;
  try {
    await agent.setup(agentRoot, block);
  } catch (err) {
    console.log(chalk.yellow(`  ⚠ Extra setup for ${agentId} failed: ${err.message}`));
  }
}

/**
 * Print post-setup instructions for an agent.
 * @param {string} agentId
 */
export function printAgentInstructions(agentId) {
  const agent = AGENTS[agentId];
  if (!agent?.postSetupSteps?.length) return;

  console.log(chalk.bold(`\n${agent.label} setup:`));
  agent.postSetupSteps.forEach((step, i) => {
    console.log(chalk.dim(`  ${i + 1}. ${step}`));
  });
}
