/**
 * ai-context-generator.js
 * 
 * Uses the CLI's native AI (Claude Code's Claude, Cursor's Claude, etc.)
 * to generate spec-compliant context files.
 * 
 * The generation-spec.json is the source of truth — the AI adapts to it,
 * not the other way around. This ensures stability across AI model changes
 * and CLI tool switching.
 * 
 * Feeds from all three tools:
 *   - OpenSpec: SEED.md patterns, active spec context
 *   - Skills.sh: Installed skill summaries, manifest data
 *   - Obsidian: Decision notes, pattern notes via bidirectional bridge
 */

import fs from "fs/promises";
import path from "path";
import { glob } from "glob";
import chalk from "chalk";
import ora from "ora";

/**
 * Main entry point: Generate context using CLI's native AI
 * 
 * @param {Object} params
 * @param {string} params.projectRoot - Project directory
 * @param {Object} params.cliAI - Reference to CLI's AI instance (Claude instance)
 * @param {Array} params.stack - Detected stack (e.g., ["nextjs", "prisma"])
 * @param {Object} params.generationSpec - The generation-spec.json schema
 * @returns {Promise<Object>} { files: {}, success: bool, messages: [] }
 */
export async function generateContextWithAI({
  projectRoot,
  cliAI,
  stack,
  generationSpec = null,
}) {
  if (!cliAI) {
    throw new Error(
      "cliAI required: Pass the CLI tool's native AI instance (Claude Code's Claude, etc.)"
    );
  }

  const spinner = ora("Generating spec-compliant context").start();
  const results = {
    files: {},
    success: false,
    messages: [],
    errors: [],
  };

  try {
    // 1. Load generation spec (or use default)
    const spec = generationSpec || (await loadGenerationSpec(projectRoot));
    results.messages.push(`Using generation-spec v${spec.version}`);

    // 2. Analyze project code
    spinner.text = "Analyzing project code...";
    const codeAnalysis = await analyzeProjectCode(projectRoot, stack, spec);
    results.messages.push(
      `Analyzed ${codeAnalysis.filesScanned} files across ${codeAnalysis.categories.length} categories`
    );

    // 3. Gather OpenSpec context (SEED.md, active specs)
    spinner.text = "Loading OpenSpec context...";
    const specContext = await gatherSpecContext(projectRoot);
    results.messages.push(
      `Spec context: SEED ${specContext.hasSeed ? "✓" : "—"}, ` +
      `${specContext.activeSpecs.length} active specs`
    );

    // 4. Gather skills manifest
    spinner.text = "Loading skills manifest...";
    const skillsContext = await gatherSkillsContext(projectRoot);
    results.messages.push(
      `Skills context: ${skillsContext.installed.length} installed skills`
    );

    // 5. Generate AGENT_CONTEXT.md using CLI AI
    spinner.text = "Generating AGENT_CONTEXT.md...";
    const agentContext = await generateAgentContext({
      cliAI,
      spec,
      stack,
      codeAnalysis,
      specContext,
      skillsContext,
      projectRoot,
    });
    results.files["AGENT_CONTEXT.md"] = agentContext;
    results.messages.push("✓ AGENT_CONTEXT.md generated");

    // 6. Generate SPECS/SEED.md using CLI AI (only if no SEED exists)
    if (!specContext.hasSeed) {
      spinner.text = "Generating SPECS/SEED.md...";
      const seedSpec = await generateSeedSpec({
        cliAI,
        spec,
        stack,
        codeAnalysis,
        skillsContext,
        projectRoot,
      });
      results.files["SPECS/SEED.md"] = seedSpec;
      results.messages.push("✓ SPECS/SEED.md generated");
    } else {
      results.messages.push("⊘ SEED.md already exists (managed by OpenSpec lifecycle)");
    }

    // 7. Generate MEMORY/INDEX.md
    results.files["MEMORY/INDEX.md"] = generateMemoryIndex();
    results.messages.push("✓ MEMORY/INDEX.md generated");

    // 8. Validate all outputs against spec
    spinner.text = "Validating spec compliance...";
    const validation = validateComplianceWithSpec(results.files, spec);
    if (validation.compliant) {
      results.messages.push("✓ All files spec-compliant");
      results.success = true;
    } else {
      results.errors.push(...validation.issues);
      results.messages.push(`⚠ ${validation.issues.length} compliance issues`);
    }

    spinner.succeed(chalk.green("✓ Context generation complete"));
  } catch (err) {
    spinner.fail(chalk.red(`✗ Generation failed: ${err.message}`));
    results.errors.push(err.message);
  }

  return results;
}

/**
 * Analyze project code to extract patterns, structure, decisions
 */
async function analyzeProjectCode(projectRoot, stack, spec) {
  const analysis = {
    filesScanned: 0,
    categories: [],
    patterns: [],
    structure: {},
  };

  const filePatterns = spec.analysis?.codeAnalysis?.filePatterns || {
    general: ["**/app/**/*.ts", "**/lib/**/*.ts", "**/src/**/*.ts"],
  };

  for (const [category, patterns] of Object.entries(filePatterns)) {
    const files = [];

    for (const pattern of patterns) {
      try {
        const matches = await glob(pattern, {
          cwd: projectRoot,
          ignore: ["**/node_modules/**", "**/.next/**", "**/dist/**"],
          maxDepth: 5,
        });

        files.push(
          ...matches.slice(0, spec.analysis?.codeAnalysis?.maxFilesPerCategory || 5)
        );
      } catch (err) {
        // Pattern didn't match anything
      }
    }

    if (files.length > 0) {
      analysis.categories.push(category);
      analysis.structure[category] = files.slice(0, 5);
      analysis.filesScanned += files.length;
    }
  }

  return analysis;
}

/**
 * Ask CLI's native AI to generate AGENT_CONTEXT.md
 * Follows the generation-spec exactly
 */
async function generateAgentContext({
  cliAI,
  spec,
  stack,
  codeAnalysis,
  specContext,
  skillsContext,
  projectRoot,
}) {
  const agentSpec = spec.files.agent_context;
  const maxTokens = extractTokenLimit(agentSpec.maxTokens);

  const prompt = `
You are persistent's context generator.

TASK: Generate a spec-compliant AGENT_CONTEXT.md file for an AI coding agent.

GENERATION SPEC:
${JSON.stringify(agentSpec, null, 2)}

PROJECT INFO:
- Stack: ${stack.join(", ")}
- Code categories found: ${codeAnalysis.categories.join(", ")}
- Files analyzed: ${codeAnalysis.filesScanned}

SEED.MD CONTEXT (architectural decisions):
${specContext.seedContent || "No SEED.md yet — generate from code analysis"}

ACTIVE SPECS:
${specContext.activeSpecs.length > 0
  ? specContext.activeSpecs.map((s) => `- ${s.slug}: ${s.status}`).join("\n")
  : "No active specs"
}

INSTALLED SKILLS:
${skillsContext.installed.length > 0
  ? skillsContext.installed.map((s) => `- ${s.id} (${s.source})`).join("\n")
  : "No skills installed"
}

CONSTRAINTS:
1. Output must be valid Markdown
2. Max token count: ${maxTokens}
3. Include all REQUIRED sections from the spec
4. Follow the exact format specified (headers, bullet lists, etc.)
5. Reference SEED.md patterns — they are the source of truth
6. Reference active spec if one exists
7. Include skill references in context

Generate the markdown now:
`;

  // Call the CLI's native AI
  const response = await cliAI.generate({
    prompt,
    maxTokens,
    temperature: 0, // Deterministic output
  });

  return response.text;
}

/**
 * Ask CLI's native AI to generate SPECS/SEED.md
 * Detailed architectural specification
 */
async function generateSeedSpec({
  cliAI,
  spec,
  stack,
  codeAnalysis,
  skillsContext,
  projectRoot,
}) {
  const seedSpec = spec.files.seed_spec;
  const maxTokens = extractTokenLimit(seedSpec.maxTokens);

  const prompt = `
You are persistent's SEED.md generator.

TASK: Generate a comprehensive architectural spec (SPECS/SEED.md) for this project.

GENERATION SPEC:
${JSON.stringify(seedSpec, null, 2)}

PROJECT INFO:
- Stack: ${stack.join(", ")}
- Categories: ${codeAnalysis.categories.join(", ")}

INSTALLED SKILLS (best practices already captured):
${skillsContext.installed.length > 0
  ? skillsContext.summaries.join("\n---\n")
  : "No skills installed yet"
}

CONSTRAINTS:
1. Max token count: ${maxTokens}
2. Include all REQUIRED sections
3. Use ADR (Architecture Decision Record) format where applicable
4. Reference installed skills for patterns (don't duplicate skill content)
5. Hard constraints, not suggestions

Output format: Markdown with proper headers and structure.

Generate the file now:
`;

  const response = await cliAI.generate({
    prompt,
    maxTokens,
    temperature: 0,
  });

  return response.text;
}

/**
 * Generate MEMORY/INDEX.md
 * (Simpler — mostly from Obsidian sync)
 */
function generateMemoryIndex() {
  return `# Project Memory Index

## Sync Information
- Last sync: ${new Date().toISOString()}
- Vault: (Obsidian vault path — sync with \`persistent sync\`)
- Tags: #persistent, #workflow, #decision

## Hot Topics
(Synced from Obsidian notes with tags: #persistent, #decision, #bug, #pattern)

## Recent Notes
(Last 7 days of notes related to this project)

## Active Issues
(Known limitations and issues the AI should be aware of)

## Decisions & Rationale
(Key architectural decisions made)

---

Run \`persistent sync\` to update this file from your Obsidian vault.
`;
}

/**
 * Validate that generated files comply with generation-spec
 */
function validateComplianceWithSpec(files, spec) {
  const validation = {
    compliant: true,
    issues: [],
  };

  for (const [filename, content] of Object.entries(files)) {
    const fileSpec = Object.values(spec.files).find((f) => f.path === filename);
    if (!fileSpec) continue;

    // Check token count (rough estimate: 1 token ≈ 4 chars)
    const estimatedTokens = content.length / 4;
    const maxTokens = extractTokenLimit(fileSpec.maxTokens);
    if (estimatedTokens > maxTokens) {
      validation.compliant = false;
      validation.issues.push(
        `${filename}: Estimated ${Math.round(estimatedTokens)} tokens exceeds max ${maxTokens}`
      );
    }

    // Check required sections exist
    if (fileSpec.structure?.sections) {
      for (const section of fileSpec.structure.sections) {
        if (section.required) {
          const sectionTitle = section.title;
          if (!content.includes(sectionTitle)) {
            validation.compliant = false;
            validation.issues.push(
              `${filename}: Missing required section "${sectionTitle}"`
            );
          }
        }
      }
    }
  }

  return validation;
}

/**
 * Gather OpenSpec context: SEED.md content + active spec info
 */
async function gatherSpecContext(projectRoot) {
  const ctx = {
    hasSeed: false,
    seedContent: null,
    activeSpecs: [],
  };

  // Read SEED.md
  try {
    ctx.seedContent = await fs.readFile(
      path.join(projectRoot, "SPECS", "SEED.md"),
      "utf8"
    );
    ctx.hasSeed = true;
  } catch {
    // No SEED.md yet
  }

  // Read active specs
  try {
    const activeDir = path.join(projectRoot, "SPECS", "active");
    const entries = await fs.readdir(activeDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      let status = "draft";
      try {
        const tasks = await fs.readFile(
          path.join(activeDir, entry.name, "tasks.md"),
          "utf8"
        );
        const total = (tasks.match(/- \[[ x]\]/g) || []).length;
        const done = (tasks.match(/- \[x\]/gi) || []).length;
        status = total > 0 ? `${Math.round((done / total) * 100)}%` : "draft";
      } catch {}
      ctx.activeSpecs.push({ slug: entry.name, status });
    }
  } catch {
    // No active specs dir
  }

  return ctx;
}

/**
 * Gather installed skills context: manifest + summaries
 */
async function gatherSkillsContext(projectRoot) {
  const ctx = {
    installed: [],
    summaries: [],
  };

  // Read manifest
  try {
    const manifest = JSON.parse(
      await fs.readFile(
        path.join(projectRoot, ".skills", ".manifest.json"),
        "utf8"
      )
    );
    ctx.installed = Object.entries(manifest.skills || {}).map(([id, info]) => ({
      id,
      source: info.source || "unknown",
      version: info.version || "unknown",
    }));
  } catch {
    // No manifest — scan .skills directory
    try {
      const skillFiles = await glob("**/*.md", {
        cwd: path.join(projectRoot, ".skills"),
        ignore: ["**/node_modules/**"],
      });
      ctx.installed = skillFiles.map((f) => ({
        id: f.replace(/\.md$/, "").replace(/[\\\/]/, "/"),
        source: "file",
        version: "unknown",
      }));
    } catch {}
  }

  // Read first 200 chars of each skill for summary
  for (const skill of ctx.installed.slice(0, 10)) {
    try {
      const [owner, name] = skill.id.split("/");
      const content = await fs.readFile(
        path.join(projectRoot, ".skills", owner, name + ".md"),
        "utf8"
      );
      ctx.summaries.push(`### ${skill.id}\n${content.slice(0, 200)}`);
    } catch {}
  }

  return ctx;
}

/**
 * Load generation-spec.json from project
 */
async function loadGenerationSpec(projectRoot) {
  const specPath = path.join(projectRoot, ".persistent", "generation-spec.json");
  try {
    const content = await fs.readFile(specPath, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    throw new Error(
      `Could not load generation-spec.json from ${specPath}: ${err.message}`
    );
  }
}

/**
 * Extract numeric token limit from spec
 */
function extractTokenLimit(tokenStr) {
  if (typeof tokenStr === "number") return tokenStr;
  if (typeof tokenStr === "string") {
    const match = tokenStr.match(/(\d+)/);
    return match ? parseInt(match[1]) : 500;
  }
  return 500;
}

export {
  generateAgentContext,
  generateSeedSpec,
  generateMemoryIndex,
  analyzeProjectCode,
  validateComplianceWithSpec,
  loadGenerationSpec,
};
