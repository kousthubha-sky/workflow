/**
 * analyzer.js
 * Uses Claude (Haiku — fast + cheap) to analyze actual project code
 * and generate skill files reflecting THIS project's real usage patterns.
 *
 * Optional feature — requires @anthropic-ai/sdk (optionalDependency).
 * Only imported when `agentflow analyze` is run.
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";
import ora from "ora";
import { glob } from "glob";

const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const BUILTIN_DIR = path.join(__dirname, "../config/builtin-skills");
const SKILLS_DIR  = ".skills";

const MAX_FILES_PER_SKILL = 8;
const MAX_CHARS_PER_FILE  = 3000;
const MODEL = "claude-haiku-4-5-20251001";

const SKILL_FILE_PATTERNS = {
  "clerk":          ["**/middleware.{ts,js}", "**/*auth*/**/*.{ts,tsx}", "**/*clerk*/**/*.{ts,tsx}", "**/sign-in/**/*.tsx", "**/sign-up/**/*.tsx"],
  "supabase":       ["**/supabase/**/*.{ts,js}", "**/lib/supabase*.{ts,js}", "**/utils/supabase*.{ts,js}", "**/migrations/**/*.sql"],
  "stripe":         ["**/stripe*.{ts,js}", "**/billing/**/*.{ts,tsx}", "**/checkout/**/*.{ts,tsx}", "**/api/webhooks/**/*.{ts,js}"],
  "nextjs":         ["**/app/layout.tsx", "**/app/page.tsx", "**/next.config.{js,ts,mjs}", "**/middleware.{ts,js}", "**/app/**/page.tsx"],
  "shadcn":         ["**/components/ui/**/*.tsx", "**/components/**/*.tsx"],
  "tailwind":       ["**/tailwind.config.{js,ts}", "**/globals.css", "**/app/globals.css"],
  "tanstack-query": ["**/providers*.{tsx,ts}", "**/hooks/use*.{ts,tsx}", "**/lib/query*.{ts,js}"],
  "trpc":           ["**/server/routers/**/*.ts", "**/trpc/**/*.ts", "**/api/trpc/**/*.ts"],
  "prisma":         ["**/prisma/schema.prisma", "**/lib/prisma*.{ts,js}", "**/lib/db*.{ts,js}"],
  "drizzle":        ["**/db/schema*.{ts,js}", "**/db/index*.{ts,js}", "**/drizzle.config*.{ts,js}"],
  "zod":            ["**/lib/validations/**/*.ts", "**/schemas/**/*.ts", "**/types/**/*.ts"],
  "react":          ["**/components/**/*.tsx", "**/hooks/**/*.{ts,tsx}"],
  "framer-motion":  ["**/components/**/*.tsx", "**/app/**/*.tsx"],
  "radix":          ["**/components/ui/**/*.tsx", "**/components/**/*.tsx"],
  "jest":           ["**/jest.config*.{js,ts}", "**/__tests__/**/*.{ts,tsx}", "**/*.test.{ts,tsx}"],
  "vitest":         ["**/vitest.config*.{ts,js}", "**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
  "docker":         ["**/Dockerfile", "**/docker-compose*.yml"],
};

const FALLBACK_PATTERNS = ["**/*.ts", "**/*.tsx"];

async function readBuiltin(skillId) {
  const filename = skillId.replace("/", "__") + ".md";
  try { return await fs.readFile(path.join(BUILTIN_DIR, filename), "utf8"); }
  catch { return null; }
}

async function gatherFilesForSkill(stackKey, cwd) {
  const patterns = SKILL_FILE_PATTERNS[stackKey] ?? FALLBACK_PATTERNS;
  const found = new Set();

  for (const pattern of patterns) {
    const matches = await glob(pattern, {
      cwd,
      ignore: ["**/node_modules/**", "**/.next/**", "**/dist/**", "**/.git/**"],
      absolute: true,
      nodir: true,
    });
    for (const f of matches) found.add(f);
    if (found.size >= MAX_FILES_PER_SKILL * 2) break;
  }

  const files = [...found];
  const skillName = stackKey.split("-")[0];
  files.sort((a, b) =>
    (a.toLowerCase().includes(skillName) ? 0 : 1) - (b.toLowerCase().includes(skillName) ? 0 : 1)
  );

  const result = [];
  for (const filepath of files.slice(0, MAX_FILES_PER_SKILL)) {
    try {
      const raw = await fs.readFile(filepath, "utf8");
      result.push({
        path: path.relative(cwd, filepath),
        content: raw.length > MAX_CHARS_PER_FILE ? raw.slice(0, MAX_CHARS_PER_FILE) + "\n// ... (truncated)" : raw,
      });
    } catch {}
  }
  return result;
}

async function generateSkillWithAI(skillId, stackKey, files, builtinContent, client) {
  const [owner, name] = skillId.split("/");

  const fileSection = files.length > 0
    ? files.map(f => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``).join("\n\n")
    : "_No relevant files found — generating from general knowledge._";

  const builtinSection = builtinContent
    ? `\n\n## Generic best practices (baseline)\n${builtinContent}`
    : "";

  const prompt = `Analyze this codebase and generate a concise skill file for an AI coding agent.

Skill: **${skillId}** (${owner} — ${name})

Extract from the actual project files:
1. How THIS project uses ${stackKey} (patterns, conventions, file locations)
2. Project-specific constraints already established
3. Patterns the agent should follow consistently
4. Anti-patterns to avoid${builtinSection}

## Project files:
${fileSection}

Output a markdown skill file (max 60 lines):

# ${skillId}
> project-specific · generated from actual code

## how-it's-used-here
[bullet points about this project's specific patterns]

## patterns
[concrete patterns found in this codebase]

## constraints
[project-specific rules the agent must respect]

## anti-patterns
[what NOT to do based on this codebase]

Rules: Be specific, include actual file paths, max 60 lines, no preamble.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  return response.content[0]?.type === "text" ? response.content[0].text : "";
}

export async function analyzeAndGenerateSkills(skillIds, stackKeys, cwd, opts = {}) {
  // Lazy-load SDK — only available if user installed it
  let Anthropic;
  try {
    ({ default: Anthropic } = await import("@anthropic-ai/sdk"));
  } catch {
    throw new Error(
      "@anthropic-ai/sdk not installed.\n" +
      "  Run: npm install @anthropic-ai/sdk\n" +
      "  Then: agentflow analyze"
    );
  }

  const apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY not set.\n" +
      "  export ANTHROPIC_API_KEY=sk-ant-...\n" +
      "  or: agentflow analyze --key sk-ant-..."
    );
  }

  const client = new Anthropic({ apiKey });
  console.log(chalk.bold(`\nAnalyzing project → generating ${skillIds.length} skill files\n`));

  const results = { generated: [], skipped: [], failed: [] };

  for (let i = 0; i < skillIds.length; i++) {
    const skillId  = skillIds[i];
    const stackKey = stackKeys[i];
    const skillPath = path.join(cwd, SKILLS_DIR, skillId.replace("/", "/") + ".md");

    if (!opts.force) {
      try {
        await fs.access(skillPath);
        results.skipped.push(skillId);
        console.log(chalk.dim(`  skip  ${skillId}`));
        continue;
      } catch {}
    }

    const spinner = ora(`  ${chalk.cyan(skillId)}`).start();
    try {
      const files   = await gatherFilesForSkill(stackKey, cwd);
      const builtin = await readBuiltin(skillId);
      const content = await generateSkillWithAI(skillId, stackKey, files, builtin, client);

      await fs.mkdir(path.join(cwd, SKILLS_DIR, skillId.split("/")[0]), { recursive: true });
      await fs.writeFile(skillPath, content, "utf8");

      results.generated.push(skillId);
      spinner.succeed(`  ${chalk.green(skillId)}  (${files.length} files sampled)`);
    } catch (err) {
      results.failed.push({ skillId, error: err.message });
      spinner.fail(`  ${chalk.red(skillId)}  ${err.message}`);
    }
  }

  console.log(`\n${chalk.bold("Done:")}`);
  if (results.generated.length) console.log(chalk.green(`  ✓ ${results.generated.length} AI-generated`));
  if (results.skipped.length)   console.log(chalk.dim(`  - ${results.skipped.length} skipped (use --force to regenerate)`));
  if (results.failed.length)    console.log(chalk.red(`  ✗ ${results.failed.length} failed`));
  console.log(chalk.dim("  Files in .skills/ — your agent reads these as context\n"));

  return results;
}
