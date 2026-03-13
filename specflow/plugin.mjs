/**
 * plugin.mjs
 * 
 * Persistent Plugin API
 * Exported for CLI tools (Claude Code, Cursor, Windsurf, etc.) to import and use.
 * 
 * Three-tool trinity:
 *   - OpenSpec (openspec.dev) — spec lifecycle
 *   - Skills.sh — dynamic skill management
 *   - Obsidian — bidirectional context layer
 * 
 * Usage:
 *   import { createPersistentPlugin } from 'persistent/plugin.mjs'
 *   const af = await createPersistentPlugin(projectRoot)
 *   await af.registerCliAI(cliAI)
 *   await af.detectAndSetup()
 */

import { createRequire } from "module";
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
import { detectAgent, updateAgent, writeAgentContext, patchAgentFile } from "./src/agent-writer.js";
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

// Node 18-safe JSON loader for getMetadata()
const _require = createRequire(import.meta.url);

/**
 * Main plugin factory
 * Called by CLI tools to initialize persistent as a plugin
 */
export async function createPersistentPlugin(projectRoot = process.cwd()) {
  return new PersistentPlugin(projectRoot);
}

class PersistentPlugin {
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
   */
  async registerCliAI(ai) {
    this.cliAI = ai;
    console.log("✓ CLI AI registered for spec-driven context generation");
  }

  /**
   * Full detection + setup (analogous to `persistent init`)
   * CLI tools call this to bootstrap persistent in a project
   */
  async detectAndSetup(options = {}) {
    const {
      agents = [],
      obsidianPath = null,
      dryRun = false,
      force = false,
      useCliAI = false,
    } = options;

    const result = {
      success: false,
      stack: [],
      agents: [],
      files: [],
      msg: "",
      method: "static",
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
          result.msg = `✓ AI-driven setup complete. Generated ${Object.keys(aiResult.files).length} spec-compliant files.`;
          result.files = Object.keys(aiResult.files);

          for (const [filename, content] of Object.entries(aiResult.files)) {
            const fullPath = path.join(this.projectRoot, filename);
            await fs.mkdir(path.dirname(fullPath), { recursive: true });
            await fs.writeFile(fullPath, content, "utf-8");
          }
        }
      } else {
        // Static template-based generation
        result.method = "static";

        // 3a. Resolve and install skills — correct arg order: (skillIds, cwd)
        const skillIds = await resolveSkills(stack);
        await installSkills(skillIds, this.projectRoot);
        result.files.push(...skillIds.map((id) => `.skills/${id}.md`));

        // 3b. Build cfg and patch agent file(s)
        const cfg = {
          stack,
          skills: skillIds,
          agents: this.selectedAgents,
          agentRoot: this.projectRoot,
        };

        for (const agentId of this.selectedAgents) {
          const { relPath } = await patchAgentFile(agentId, this.projectRoot, cfg);
          if (relPath) result.files.push(relPath);
        }

        result.msg = `✓ Static setup complete. Updated ${result.files.length} files.`;
      }

      // 4. Sync Obsidian — correct arg order: (vaultPath, cwd, opts)
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

      // 5. Write config — correct arg order: (cfg, cwd)
      await writeConfig(
        {
          stack,
          agents: this.selectedAgents,
          lastSync: new Date().toISOString(),
          method: result.method,
          obsidianPath: obsidianPath ?? null,
        },
        this.projectRoot
      );

      result.success = true;
    } catch (err) {
      result.msg = `✗ Setup failed: ${err.message}`;
    }

    return result;
  }

  /**
   * Detect only (no changes)
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
   */
  async updateAgent(agentIds = []) {
    if (!this.detectedStack) {
      const { keys: stack } = await detectStack(this.projectRoot);
      this.detectedStack = stack;
    }

    const skillIds = await resolveSkills(this.detectedStack);
    const cfg = {
      stack: this.detectedStack,
      skills: skillIds,
      agents: agentIds,
      agentRoot: this.projectRoot,
    };
    const updated = [];

    for (const agentId of agentIds) {
      const { relPath } = await patchAgentFile(agentId, this.projectRoot, cfg);
      if (relPath) updated.push(relPath);
    }

    return { updated };
  }

  /**
   * Sync Obsidian vault → MEMORY/INDEX.md
   */
  async syncMemory(obsidianPath) {
    try {
      // Correct arg order: (vaultPath, cwd, opts)
      await syncObsidian(obsidianPath, this.projectRoot);
      return { success: true, file: "MEMORY/INDEX.md" };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Get plugin metadata
   */
  getMetadata() {
    // Use createRequire (set up at top of file) — safe for Node 18 ESM
    const pkg = _require("./package.json");
    return {
      name: "persistent",
      version: pkg.version,
      description: "Universal AI workflow bootstrap",
    };
  }

  /**
   * Propose a new spec for a feature
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

  async searchSkills(query, options = {}) {
    return searchSkills(query, options);
  }

  async discoverSkills() {
    if (!this.detectedStack) {
      const { keys: stack } = await detectStack(this.projectRoot);
      this.detectedStack = stack;
    }
    return discoverSkills(this.detectedStack, this.projectRoot);
  }

  async createSkill(skillId, options = {}) {
    return createSkillFromProject(skillId, this.projectRoot, {
      cliAI: this.cliAI,
      obsidianPath: options.obsidianPath,
    });
  }

  async evolveSkill(skillId, options = {}) {
    return evolveSkill(skillId, this.projectRoot, {
      cliAI: this.cliAI,
    });
  }

  async updateSkills() {
    return updateSkills(this.projectRoot);
  }

  // ─── Obsidian Context Layer ─────────────────────────────────────────────

  async syncBidirectional(obsidianPath) {
    return bidirectionalSync(obsidianPath, this.projectRoot);
  }

  async getSpecNotes(obsidianPath) {
    return getOpenSpecNotes(obsidianPath);
  }

  async getSkillNotes(obsidianPath) {
    return getSkillNotes(obsidianPath);
  }
}

export { PersistentPlugin };
