#!/usr/bin/env node
import { program } from "commander";
import { init } from "../src/init.js";
import {
  syncObsidian,
  discoverVaults,
  bidirectionalSync,
  getSkillNotes,
} from "../src/obsidian-bridge.js";
import { updateAgent } from "../src/agent-writer.js";
import {
  addSkill,
  searchSkills,
  createSkillFromProject,
  evolveSkill,
  updateSkills,
  listInstalledSkills,
} from "../src/skills-loader.js";
import {
  runSpec,
  validateSpecCmd,
  archiveSpec,
  listSpecs,
  seedCmd,
  seedEvolveCmd,
  seedCleanCmd,
} from "../src/spec-runner.js";
import {
  mergeDecisionsIntoSeed,
  buildObsidianContextBlock,
  updateOpenSpec,
} from "../src/openspec-integration.js";
import { readConfig, writeConfig } from "../src/config.js";
import fs from "fs/promises";
import path from "path";
import { createRequire } from "module";
import chalk from "chalk";

// Node 18-safe JSON loader (avoids `with { type: "json" }` which is Node 20+ only)
const _require = createRequire(import.meta.url);

program
  .name("persistent")
  .description(
    "Universal AI workflow bootstrap — OpenSpec + skills.sh + Obsidian"
  )
  .version("0.2.7");

// ── init ─────────────────────────────────────────────────────────────────
program
  .command("init")
  .description(
    "Setup: detect stack → install skills.sh skills → run openspec init → sync Obsidian → patch agent file"
  )
  .option("--agent <n>", "Force agent (claude-code|opencode|copilot|cursor|aider|windsurf|continue)")
  .option("--obsidian <path>", "Absolute path to Obsidian vault")
  .option("--dry-run", "Preview without writing")
  .action(async (opts) => {
    await init(opts);
  });

// ── update ────────────────────────────────────────────────────────────────
program
  .command("update")
  .description("Re-analyze project, re-patch agent file + run openspec update")
  .option("--agent <n>", "Target agent override")
  .action(async (opts) => {
    const cwd = process.cwd();
    const cfg = await readConfig();

    // Re-extract project context so agent file gets fresh patterns
    const { extractProjectContext } = await import("../src/context-extractor.js");
    const { extractSeedContent } = await import("../src/context-extractor.js");

    console.log(chalk.dim("  Analyzing project..."));
    const extractedContext = await extractProjectContext(cwd, cfg.stack || []);

    // Also pull patterns from existing SEED.md
    const seedContent = await extractSeedContent(cwd);
    if (seedContent.patterns.length) {
      extractedContext.patterns = [
        ...seedContent.patterns,
        ...(extractedContext.patterns || []),
      ];
    }
    if (seedContent.constraints.length) {
      extractedContext.constraints = [
        ...seedContent.constraints,
        ...(extractedContext.constraints || []),
      ];
    }
    if (seedContent.antiPatterns.length) {
      extractedContext.antiPatterns = [
        ...seedContent.antiPatterns,
        ...(extractedContext.antiPatterns || []),
      ];
    }

    cfg.extractedContext = extractedContext;
    await updateAgent(cfg, opts.agent);
    await updateOpenSpec(cwd);
  });

// ── sync ──────────────────────────────────────────────────────────────────
program
  .command("sync")
  .description(
    "Bidirectional Obsidian sync:\n" +
    "  Pull: vault → MEMORY/INDEX.md\n" +
    "  Route: #spec/#decision notes → MEMORY/INDEX.md OpenSpec block + SEED.md\n" +
    "  Route: #pattern/#skill notes → skill candidates (run persistent skill --create)\n" +
    "  Push: SEED.md + archived specs → vault"
  )
  .option("--pin <folder>", "Add a vault folder to always-pull list")
  .option("--discover", "Auto-discover Obsidian vaults on this machine")
  .option("--one-way", "Pull from vault only (no push-back)")
  .action(async (opts) => {
    const cwd = process.cwd();

    if (opts.discover) {
      const vaults = await discoverVaults();
      if (!vaults.length) {
        console.log(chalk.yellow("No Obsidian vaults found automatically."));
        console.log(chalk.dim("Provide path manually: persistent init --obsidian <path>"));
      } else {
        console.log(chalk.bold("Found vaults:"));
        for (const v of vaults)
          console.log("  " + chalk.green(v.name) + "  " + chalk.dim(v.path));
        console.log(chalk.dim("\nUse: persistent init --obsidian <path>"));
      }
      return;
    }

    const cfg = await readConfig();
    if (!cfg.obsidianPath) {
      console.error(chalk.red("No vault configured."));
      console.log(chalk.dim("Run: persistent init --obsidian <path>"));
      console.log(chalk.dim("Or:  persistent sync --discover"));
      process.exit(1);
    }

    if (opts.pin) {
      const pins = cfg.pinnedFolders ?? [];
      if (!pins.includes(opts.pin)) {
        pins.push(opts.pin);
        cfg.pinnedFolders = pins;
        await writeConfig(cfg);
        console.log(chalk.green("✓") + ` Pinned folder: ${chalk.cyan(opts.pin)}`);
      }
    }

    if (opts.oneWay) {
      const synced = await syncObsidian(cfg.obsidianPath, cwd, {
        pinnedFolders: cfg.pinnedFolders ?? [],
      });
      if (synced) {
        cfg.lastSync = new Date().toISOString();
        await writeConfig(cfg);
      }
      return;
    }

    // ── Full bidirectional sync ──────────────────────────────────────────
    const result = await bidirectionalSync(cfg.obsidianPath, cwd, {
      pinnedFolders: cfg.pinnedFolders ?? [],
    });

    cfg.lastSync = new Date().toISOString();
    await writeConfig(cfg);

    // ── Consume routed notes ─────────────────────────────────────────────

    // 1. Merge #decision / #architecture notes into SEED.md
    const decisionNotes = result.decisionNotes || [];
    if (decisionNotes.length) {
      const seedPath = path.join(cwd, "SPECS", "SEED.md");
      await mergeDecisionsIntoSeed(seedPath, decisionNotes);
    }

    // 2. Append OpenSpec context block to MEMORY/INDEX.md
    const specNotes = result.specNotes || [];
    if (specNotes.length || decisionNotes.length) {
      const contextBlock = buildObsidianContextBlock(specNotes, decisionNotes);
      const memoryPath = path.join(cwd, "MEMORY", "INDEX.md");
      try {
        const existing = await fs.readFile(memoryPath, "utf8");
        const MARKER = "## obsidian-context-for-openspec";
        if (existing.includes(MARKER)) {
          const before = existing.slice(0, existing.indexOf(MARKER));
          await fs.writeFile(memoryPath, before.trimEnd() + "\n\n" + contextBlock, "utf8");
        } else {
          await fs.appendFile(memoryPath, "\n\n" + contextBlock, "utf8");
        }
        console.log(
          chalk.green("✓") +
          ` MEMORY/INDEX.md: +${specNotes.length} spec notes, +${decisionNotes.length} decision notes`
        );
      } catch {
        // MEMORY/INDEX.md doesn't exist yet — syncObsidian creates it
      }
    }

    // 3. Report skill candidates
    const skillNotes = result.skillNotes || [];
    if (skillNotes.length) {
      console.log(
        chalk.dim(
          `  ${skillNotes.length} Obsidian notes with #pattern/#skill tags found.`
        )
      );
      console.log(
        chalk.dim("  Create skills from them: persistent skill --create <owner/repo/skill-name>")
      );
    }
  });

// ── spec ──────────────────────────────────────────────────────────────────
program
  .command("spec [feature]")
  .description(
    "OpenSpec + SEED.md commands:\n" +
    '  persistent spec "feature"           — show /opsx slash commands for feature\n' +
    "  persistent spec --list              — list active OpenSpec changes\n" +
    "  persistent spec --validate <id>     — check change folder structure\n" +
    "  persistent spec --archive <id>      — show archive instructions\n" +
    "  persistent spec --seed-evolve <id>  — evolve SEED.md from archived change\n" +
    "  persistent spec --seed              — (re)create SEED.md\n" +
    "  persistent spec --seed-clean        — deduplicate SEED.md"
  )
  .option("--archive <id>",      "Show archive instructions for a change id")
  .option("--validate <id>",     "Validate a change folder")
  .option("--list",              "List active OpenSpec changes")
  .option("--seed",              "Re-initialize SEED.md")
  .option("--seed-evolve <id>",  "Evolve SEED.md from an archived OpenSpec change")
  .option("--seed-clean",        "Deduplicate SEED.md")
  .action(async (feature, opts) => {
    if (opts.archive)           await archiveSpec(opts.archive);
    else if (opts.validate)     await validateSpecCmd(opts.validate);
    else if (opts.list)         await listSpecs();
    else if (opts.seed)         await seedCmd();
    else if (opts.seedEvolve)   await seedEvolveCmd(opts.seedEvolve);
    else if (opts.seedClean)    await seedCleanCmd();
    else if (feature)           await runSpec(feature);
    else {
      console.log(chalk.bold("OpenSpec via persistent:\n"));
      console.log(chalk.dim('  persistent spec "feature"           — show /opsx commands'));
      console.log(chalk.dim("  persistent spec --list              — list active changes"));
      console.log(chalk.dim("  persistent spec --seed-evolve <id>  — update SEED.md after archive"));
      console.log(chalk.dim("  persistent spec --seed-clean        — deduplicate SEED.md\n"));
      console.log(chalk.bold("Inside your agent (OpenSpec slash commands):"));
      console.log(chalk.dim('  /opsx:new "feature"   — create a change'));
      console.log(chalk.dim("  /opsx:ff              — generate proposal + design + tasks"));
      console.log(chalk.dim("  /opsx:apply           — implement tasks"));
      console.log(chalk.dim("  /opsx:archive         — archive + mark complete\n"));
      console.log(chalk.dim("  Install OpenSpec: npm install -g @fission-ai/openspec@latest"));
    }
  });

// ── add-skill ─────────────────────────────────────────────────────────────
program
  .command("add-skill <skill>")
  .description("Install a skill from skills.sh (format: owner/repo/skill-name)")
  .action(async (skill) => {
    const cfg = await readConfig();
    await addSkill(skill, process.cwd(), cfg);
  });

// ── skill ─────────────────────────────────────────────────────────────────
program
  .command("skill")
  .description("skills.sh lifecycle: search, create, evolve, update, list")
  .option("--search <query>", "Search skills.sh registry")
  .option("--create <id>",    "Create a skill from Obsidian patterns + project code")
  .option("--evolve <id>",    "Evolve an existing skill with new patterns")
  .option("--update",         "Update all installed skills via skills.sh")
  .option("--list",           "List installed skills")
  .action(async (opts) => {
    const cwd = process.cwd();

    if (opts.search) {
      const results = await searchSkills(opts.search);
      if (!results.length) {
        console.log(chalk.dim(`No results. Try: npx skills search ${opts.search}`));
        console.log(chalk.dim("Browse: https://skills.sh"));
      } else {
        console.log(chalk.bold(`Found ${results.length} skills:\n`));
        for (const s of results)
          console.log(`  ${chalk.cyan(s.id)} — ${s.description || ""}`);
      }
    } else if (opts.create) {
      const cfg = await readConfig();
      const obsidianNotes = cfg.obsidianPath
        ? await getSkillNotes(cfg.obsidianPath).catch(() => [])
        : [];
      await createSkillFromProject(opts.create, cwd, {
        obsidianNotes,
        stack: cfg.stack || [],
      });
    } else if (opts.evolve) {
      await evolveSkill(opts.evolve, cwd);
    } else if (opts.update) {
      await updateSkills(cwd);
    } else if (opts.list) {
      const installed = await listInstalledSkills(cwd);
      if (!installed.length) {
        console.log(chalk.dim("No skills installed."));
        console.log(chalk.dim("Add one: persistent add-skill owner/repo/skill-name"));
        console.log(chalk.dim("Browse:  https://skills.sh"));
      } else {
        console.log(chalk.bold(`${installed.length} installed skills:\n`));
        for (const s of installed)
          console.log(`  ${chalk.cyan(s.id)} — ${s.source ?? "local"} ${chalk.dim(s.version ?? "")}`);
      }
    } else {
      console.log(chalk.bold("skills.sh via persistent:\n"));
      console.log(chalk.dim("  persistent skill --search <query>   — search registry"));
      console.log(chalk.dim("  persistent skill --create <id>      — create from Obsidian patterns"));
      console.log(chalk.dim("  persistent skill --evolve <id>      — add new patterns"));
      console.log(chalk.dim("  persistent skill --update           — update all installed"));
      console.log(chalk.dim("  persistent skill --list             — list installed\n"));
      console.log(chalk.dim("  Direct install: npx skills add owner/repo/skill-name"));
      console.log(chalk.dim("  Browse:         https://skills.sh"));
    }
  });

// ── analyze ───────────────────────────────────────────────────────────────
program
  .command("analyze")
  .description("AI-analyze codebase → generate project-specific skill files in .skills/")
  .option("--key <key>", "Anthropic API key (or set ANTHROPIC_API_KEY env var)")
  .option("--force", "Regenerate skills even if they exist")
  .option("--only <skills>", "Comma-separated skill ids to regenerate")
  .action(async (opts) => {
    const apiKey = opts.key || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error(chalk.red("✗ ANTHROPIC_API_KEY required for analyze."));
      console.log(chalk.dim("  Set:  export ANTHROPIC_API_KEY=sk-ant-..."));
      console.log(chalk.dim("  Or:   persistent analyze --key sk-ant-..."));
      process.exit(1);
    }

    const { analyzeAndGenerateSkills } = await import("../src/analyzer.js").catch(() => {
      console.error(chalk.red("analyzer module not available"));
      process.exit(1);
    });

    const cfg = await readConfig();
    if (!cfg.stack?.length) {
      console.error(chalk.red("No stack config found. Run: persistent init first."));
      process.exit(1);
    }

    const { resolveSkills } = await import("../src/skills-loader.js");

    // Node 18-safe JSON read — `with { type: "json" }` is Node 20+ only
    const skillsMap = _require("../config/skills-map.json");

    const allSkillIds = await resolveSkills(cfg.stack);
    const skillToStack = {};
    for (const [stackKey, ids] of Object.entries(skillsMap)) {
      for (const id of ids) skillToStack[id] = stackKey;
    }

    let targets = allSkillIds;
    if (opts.only) {
      const only = new Set(opts.only.split(",").map((s) => s.trim()));
      targets = allSkillIds.filter((id) => only.has(id));
      if (!targets.length) {
        console.error(chalk.red(`None of the specified skills found: ${opts.only}`));
        process.exit(1);
      }
    }

    const stackKeys = targets.map((id) => skillToStack[id] ?? id.split("/")[0]);
    await analyzeAndGenerateSkills(targets, stackKeys, process.cwd(), {
      apiKey,
      force: opts.force ?? false,
    });
  });

program.parse();
