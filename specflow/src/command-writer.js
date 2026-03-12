/**
 * command-writer.js
 * 
 * Writes slash command files to agent-specific directories so that
 * persistent features appear as native slash commands in AI CLI tools.
 * 
 * Supported agents:
 *   - Claude Code → .claude/commands/persistent-*.md
 *   - OpenCode   → .opencode/commands/persistent-*.md
 * 
 * Commands are markdown files that the AI reads when a user types /persistent-*
 * in the agent's chat interface.
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Agent ID → directory where slash commands live */
const COMMAND_DIRS = {
  "claude-code": ".claude/commands",
  "opencode":    ".opencode/commands",
};

/** All persistent slash commands (filename without extension) */
const COMMAND_NAMES = [
  "persistent-init",
  "persistent-spec",
  "persistent-skill",
  "persistent-sync",
  "persistent-analyze",
];

/**
 * Get the path to the templates/commands/ directory.
 * Works both when running from source and when installed as an npm package.
 */
function getTemplatesDir() {
  return path.resolve(__dirname, "..", "templates", "commands");
}

/**
 * Write all persistent slash commands for a given agent.
 * 
 * @param {string} agentId - The agent identifier (e.g., "claude-code", "opencode")
 * @param {string} projectRoot - Absolute path to the project root
 * @returns {Promise<{written: string[], skipped: string[]}>}
 */
export async function writeSlashCommands(agentId, projectRoot) {
  const commandDir = COMMAND_DIRS[agentId];
  if (!commandDir) {
    return { written: [], skipped: COMMAND_NAMES, agentId };
  }

  const templatesDir = getTemplatesDir();
  const targetDir = path.join(projectRoot, commandDir);
  const written = [];
  const skipped = [];

  // Ensure target directory exists
  await fs.mkdir(targetDir, { recursive: true });

  for (const cmdName of COMMAND_NAMES) {
    const templatePath = path.join(templatesDir, `${cmdName}.md`);
    const targetPath = path.join(targetDir, `${cmdName}.md`);

    try {
      const content = await fs.readFile(templatePath, "utf-8");
      await fs.writeFile(targetPath, content, "utf-8");
      written.push(cmdName);
    } catch (err) {
      // Template missing — skip silently
      skipped.push(cmdName);
    }
  }

  return { written, skipped, agentId };
}

/**
 * Write slash commands for multiple agents.
 * 
 * @param {string[]} agentIds - List of agent identifiers
 * @param {string} projectRoot - Absolute path to the project root
 * @returns {Promise<{results: Array<{agentId: string, written: string[], skipped: string[]}>}>}
 */
export async function writeAllSlashCommands(agentIds, projectRoot) {
  const results = [];

  for (const agentId of agentIds) {
    if (!COMMAND_DIRS[agentId]) continue; // Agent doesn't support slash commands
    const result = await writeSlashCommands(agentId, projectRoot);
    results.push(result);

    if (result.written.length > 0) {
      console.log(
        chalk.green("✓") +
        ` Slash commands for ${chalk.cyan(agentId)}: ` +
        chalk.dim(`${result.written.length} commands → ${COMMAND_DIRS[agentId]}/`)
      );
    }
  }

  return { results };
}

/**
 * List which agents support slash commands.
 * @returns {Object<string, string>} Map of agent ID → command directory
 */
export function getSupportedCommandAgents() {
  return { ...COMMAND_DIRS };
}

/**
 * Check if an agent supports slash commands.
 * @param {string} agentId
 * @returns {boolean}
 */
export function supportsSlashCommands(agentId) {
  return agentId in COMMAND_DIRS;
}

export { COMMAND_DIRS, COMMAND_NAMES };
