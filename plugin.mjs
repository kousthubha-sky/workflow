/**
 * plugin.mjs
 * 
 * Specflow Plugin API
 * Exported for CLI tools (Claude Code, Cursor, Windsurf, etc.) to import and use.
 * 
 * Three-tool trinity:
 *   - OpenSpec (openspec.dev) — spec lifecycle
 *   - Skills.sh — dynamic skill management
 *   - Obsidian — bidirectional context layer
 * 
 * Usage:
 *   import { createSpecflowPlugin } from 'specflow/plugin.mjs'
 *   const af = await createSpecflowPlugin(projectRoot)
 *   await af.registerCliAI(cliAI)
 *   await af.detectAndSetup()
 */

import { detectStack } from "./src/detect-stack.js";
import {
  resolveSkills,
  installSkills,
  searchSkills,
  discoverSkills,
  createSkillFromProject,
  evolveSkill,
  updateSkills,
  listInstalledSkills,
} from "./src/skills-loader.js";
import { detectAgent, updateAgent, writeAgentContext } from "./src/agent-writer.js";
import { runAgentSetup, AGENTS } from "./src/agent-setup.js";
import {
  syncObsidian,
  discoverVaults,
  bidirectionalSync,
  getOpenSpecNotes,
  getSkillNotes,
} from "./src/obsidian-bridge.js";
import { writeConfig, readConfig } from "./src/config.js";
import { generateContextWithAI, loadGenerationSpec } from "./src/ai-context-generator.js";
import {
  proposeSpec,
  validateSpec,
  archiveSpecWithEvolution,
  listActiveSpecs,
  regenerateSeed,
} from "./src/openspec-integration.js";
import path from "path";
import fs from "fs/promises";

/**
 * Main plugin factory
 * Called by CLI tools to initialize specflow as a plugin
 */
export async function createSpecflowPlugin(projectRoot = process.cwd()) {
  return new SpecflowPlugin(projectRoot);
}

class SpecflowPlugin {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.config = null;
    this.detectedStack = null;
    this.detectedAgent = null;
    this.selectedAgents = [];
    this.cliAI = null; // CLI tool's native AI instance (Claude Code's Claude, etc.)
    this.generationSpec = null;
  }

  /**
   * Register the CLI tool's native AI instance
   * This enables spec-driven context generation using the CLI's AI
   * 
   * @param {Object} ai - CLI's native AI instance
   * Example (Claude Code):
   *   const codeAI = await claudeCode.getAI(); // Returns Claude instance
   *   await specflow.registerCliAI(codeAI);
   */
  async registerCliAI(ai) {
    this.cliAI = ai;
    console.log("✓ CLI AI registered for spec-driven context generation");
  }

  /**
   * Full detection + setup (analagous to `specflow init`)
   * CLI tools call this to bootstrap specflow in a project
   * 
   * New: If cliAI is registered, uses spec-driven context generation
   */
  async detectAndSetup(options = {}) {
    const {
      agents = [], // pre-selected agent list, or auto-detect if empty
      obsidianPath = null,
      dryRun = false,
      force = false,
      useCliAI = false, // Use CLI's native AI for context generation
    } = options;

    const result = {
      success: false,
      stack: [],
      agents: [],
      files: [],
      msg: "",
      method: "static", // "static" or "ai-driven"
    };

    try {
      // 1. Detect stack
      const { keys: stack } = await detectStack(this.projectRoot);
      this.detectedStack = stack;
      result.stack = stack;

      // 2. Detect or use provided agents
      if (agents.length > 0) {
        this.selectedAgents = agents;
      } else {
        const { agent } = await detectAgent(this.projectRoot);
        this.selectedAgents = agent !== "generic" ? [agent] : ["claude-code"];
      }
      result.agents = this.selectedAgents;

      if (dryRun) {
        result.msg = `DRY RUN: Would set up agents: ${this.selectedAgents.join(", ")} with stack: ${stack.join(", ")}`;
        return result;
      }

      // 3. Choose generation method
      if (useCliAI && this.cliAI) {
        // Use CLI's native AI for spec-driven context generation
        result.method = "ai-driven";
        const aiResult = await generateContextWithAI({
          projectRoot: this.projectRoot,
          cliAI: this.cliAI,
          stack,
          generationSpec: this.generationSpec,
        });

        if (!aiResult.success) {
          result.msg = `AI generation had issues: ${aiResult.errors.join(", ")}`;
          result.files = Object.keys(aiResult.files);
        } else {
          result.msg = `✓ AI-driven setup complete. Generated ${aiResult.files.length} spec-compliant files.`;
          result.files = Object.keys(aiResult.files);

          // Write the AI-generated files
          for (const [filename, content] of Object.entries(aiResult.files)) {
            const fullPath = path.join(this.projectRoot, filename);
            await fs.mkdir(path.dirname(fullPath), { recursive: true });
            await fs.writeFile(fullPath, content, "utf-8");
          }
        }
      } else {
        // Use static template-based generation (original flow)
        result.method = "static";
        
        // 3a. Resolve and install skills
        const skillIds = await resolveSkills(stack);
        await installSkills(this.projectRoot, skillIds, { force });
        result.files.push(...skillIds.map((id) => `.skills/${id}.md`));

        // 3b. Write context files for each agent
        for (const agentId of this.selectedAgents) {
          const contextFile = await writeAgentContext(this.projectRoot, agentId, stack, skillIds);
          if (contextFile) result.files.push(contextFile);
        }

        result.msg = `✓ Static setup complete. Updated ${result.files.length} files.`;
      }

      // 4. Sync Obsidian (bidirectional if possible)
      if (obsidianPath) {
        const syncResult = await bidirectionalSync(obsidianPath, this.projectRoot, {
          pinnedFolders: [],
        });
        result.files.push("MEMORY/INDEX.md");
        result.obsidianRouted = {
          specNotes: syncResult.routed.openspec,
          skillNotes: syncResult.routed.skills,
          pushed: syncResult.pushed,
        };
      }

      // 5. Write config
      await writeConfig(this.projectRoot, {
        stack,
        agents: this.selectedAgents,
        lastSync: new Date().toISOString(),
        method: result.method,
      });

      result.success = true;
    } catch (err) {
      result.msg = `✗ Setup failed: ${err.message}`;
    }

    return result;
  }

  /**
   * Detect only (no changes)
   * Returns stack and agent info for the CLI tool to display
   */
  async detect() {
    const { keys: stack } = await detectStack(this.projectRoot);
    const { agent } = await detectAgent(this.projectRoot);

    return {
      stack,
      currentAgent: agent,
      availableAgents: Object.keys(AGENTS),
    };
  }

  /**
   * Update context for specific agent(s)
   * CLI tool calls this when user changes agent or stack
   */
  async updateAgent(agentIds = []) {
    if (!this.detectedStack) {
      const { keys: stack } = await detectStack(this.projectRoot);
      this.detectedStack = stack;
    }

    const skillIds = await resolveSkills(this.detectedStack);
    const updated = [];

    for (const agentId of agentIds) {
      const contextFile = await writeAgentContext(
        this.projectRoot,
        agentId,
        this.detectedStack,
        skillIds
      );
      if (contextFile) updated.push(contextFile);
    }

    return { updated };
  }

  /**
   * Sync Obsidian vault → MEMORY/INDEX.md
   */
  async syncMemory(obsidianPath) {
    try {
      await syncObsidian(this.projectRoot, { path: obsidianPath });
      return { success: true, file: "MEMORY/INDEX.md" };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Get plugin metadata
   * CLI tools use this for display/logging
   */
  getMetadata() {
    return {
      name: "specflow",
      version: require("./package.json").version,
      description: "Universal AI workflow bootstrap",
      supportedAgents: Object.entries(AGENTS).map(([id, agent]) => ({
        id,
        label: agent.label,
        integrationFile: agent.integrationFile,
      })),
    };
  }

  /**
   * List available skills for detected stack
   */
  async listSkills() {
    if (!this.detectedStack) {
      const { keys: stack } = await detectStack(this.projectRoot);
      this.detectedStack = stack;
    }

    const skillIds = await resolveSkills(this.detectedStack);
    const installed = await listInstalledSkills(this.projectRoot);
    return { stack: this.detectedStack, skills: skillIds, installed };
  }

  // ─── OpenSpec Lifecycle ─────────────────────────────────────────────────

  /**
   * Propose a new spec for a feature
   * Uses openspec CLI when available, falls back to local creation
   */
  async proposeSpec(feature, options = {}) {
    return proposeSpec(feature, this.projectRoot, {
      cliAI: this.cliAI,
      obsidianPath: options.obsidianPath,
    });
  }

  /**
   * Validate a spec against SEED.md and generation-spec
   */
  async validateSpec(slug) {
    return validateSpec(slug, this.projectRoot);
  }

  /**
   * Archive a completed spec with SEED.md evolution
   */
  async archiveSpec(slug, options = {}) {
    return archiveSpecWithEvolution(slug, this.projectRoot, {
      cliAI: this.cliAI,
    });
  }

  /**
   * List active specs with progress
   */
  async listSpecs() {
    return listActiveSpecs(this.projectRoot);
  }

  /**
   * Regenerate SEED.md from archived spec patterns
   */
  async regenerateSeed() {
    return regenerateSeed(this.projectRoot, { cliAI: this.cliAI });
  }

  // ─── Skills.sh Lifecycle ────────────────────────────────────────────────

  /**
   * Search skills.sh registry
   */
  async searchSkills(query, options = {}) {
    return searchSkills(query, options);
  }

  /**
   * Discover community skills for detected stack
   */
  async discoverSkills() {
    if (!this.detectedStack) {
      const { keys: stack } = await detectStack(this.projectRoot);
      this.detectedStack = stack;
    }
    return discoverSkills(this.detectedStack, this.projectRoot);
  }

  /**
   * Create a skill from project patterns + Obsidian notes
   */
  async createSkill(skillId, options = {}) {
    return createSkillFromProject(skillId, this.projectRoot, {
      cliAI: this.cliAI,
      obsidianPath: options.obsidianPath,
    });
  }

  /**
   * Evolve an existing skill with new patterns
   */
  async evolveSkill(skillId, options = {}) {
    return evolveSkill(skillId, this.projectRoot, {
      cliAI: this.cliAI,
    });
  }

  /**
   * Update all installed skills via skills.sh
   */
  async updateSkills() {
    return updateSkills(this.projectRoot);
  }

  // ─── Obsidian Context Layer ─────────────────────────────────────────────

  /**
   * Full bidirectional Obsidian sync
   * Pull notes → route by tags → push specs/skills/SEED back
   */
  async syncBidirectional(obsidianPath) {
    return bidirectionalSync(obsidianPath, this.projectRoot);
  }

  /**
   * Get Obsidian notes routed to OpenSpec (#spec, #decision)
   */
  async getSpecNotes(obsidianPath) {
    return getOpenSpecNotes(obsidianPath);
  }

  /**
   * Get Obsidian notes routed to skills (#pattern, #skill)
   */
  async getSkillNotes(obsidianPath) {
    return getSkillNotes(obsidianPath);
  }
}

export { SpecflowPlugin };
