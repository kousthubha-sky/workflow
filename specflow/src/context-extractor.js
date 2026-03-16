/**
 * context-extractor.js
 * Scans the actual codebase to extract meaningful context for SEED.md and agent files.
 *
 * This is the "intelligence layer" that makes persistent's output
 * project-specific instead of generic templates.
 *
 * Extracts:
 *   - README summary (what the project does)
 *   - File structure (how the project is organized)
 *   - Code patterns (how the project actually works)
 *   - Existing docs/constraints (what's already documented)
 *   - Package scripts (how to run/build/test)
 */

import fs from "fs/promises";
import path from "path";
import { glob } from "glob";

// ─── README Extraction ──────────────────────────────────────────────────────

/**
 * Extract a concise project summary from README.
 * Grabs the first meaningful paragraph (skips badges, titles, TOC).
 * @param {string} cwd
 * @returns {Promise<string|null>}
 */
export async function extractReadmeSummary(cwd) {
  const candidates = ["README.md", "readme.md", "Readme.md", "README.rst", "README"];
  for (const name of candidates) {
    try {
      const content = await fs.readFile(path.join(cwd, name), "utf8");
      return parseReadmeSummary(content);
    } catch {}
  }
  return null;
}

function parseReadmeSummary(content) {
  const lines = content.split("\n");
  const summary = [];
  let foundContent = false;

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip badges, images, empty lines at start
    if (!foundContent) {
      if (!trimmed) continue;
      if (trimmed.startsWith("![")) continue;      // badge images
      if (trimmed.startsWith("[![")) continue;     // badge links
      if (trimmed.startsWith("<")) continue;        // HTML tags
      if (trimmed.startsWith("# ")) continue;      // title
      if (trimmed.startsWith("---")) continue;      // horizontal rules
      foundContent = true;
    }

    if (foundContent) {
      // Stop at next heading, TOC, or horizontal rule
      if (trimmed.startsWith("## ")) break;
      if (trimmed.startsWith("# ")) break;
      if (trimmed.startsWith("---")) break;
      if (trimmed.toLowerCase().startsWith("## table of contents")) break;
      if (trimmed.toLowerCase().startsWith("## toc")) break;
      if (trimmed.startsWith("- [")) break; // TOC links

      if (trimmed) summary.push(trimmed);
      if (summary.length >= 5) break; // cap at 5 lines
    }
  }

  return summary.length > 0 ? summary.join(" ").slice(0, 500) : null;
}

// ─── File Structure Extraction ──────────────────────────────────────────────

/**
 * Build a compact directory tree showing the project's organization.
 * Only shows top 2 levels + key deeper paths.
 * @param {string} cwd
 * @returns {Promise<string[]>} Array of path descriptions
 */
export async function extractFileStructure(cwd) {
  const structure = [];

  // Check for common directory patterns
  const dirChecks = [
    ["src", "Source code"],
    ["app", "Next.js App Router"],
    ["pages", "Next.js Pages Router / page files"],
    ["components", "UI components"],
    ["lib", "Shared libraries/utilities"],
    ["utils", "Utility functions"],
    ["hooks", "React hooks"],
    ["api", "API routes/endpoints"],
    ["server", "Server-side code"],
    ["prisma", "Prisma schema & migrations"],
    ["db", "Database layer"],
    ["public", "Static assets"],
    ["styles", "Stylesheets"],
    ["tests", "Test files"],
    ["test", "Test files"],
    ["__tests__", "Test files"],
    ["e2e", "End-to-end tests"],
    ["cypress", "Cypress tests"],
    ["docs", "Documentation"],
    ["scripts", "Build/utility scripts"],
    ["config", "Configuration"],
    ["types", "TypeScript type definitions"],
    ["middleware", "Middleware"],
    ["services", "Service layer"],
    ["models", "Data models"],
    ["controllers", "Controllers"],
    ["routes", "Route definitions"],
    ["store", "State management"],
    ["context", "React context providers"],
    ["providers", "Providers/wrappers"],
    ["actions", "Server actions"],
    ["supabase", "Supabase config/migrations"],
  ];

  for (const [dir, desc] of dirChecks) {
    // Check both root and src/ level
    for (const prefix of ["", "src/"]) {
      const fullPath = path.join(cwd, prefix + dir);
      try {
        const stat = await fs.stat(fullPath);
        if (stat.isDirectory()) {
          const entries = await fs.readdir(fullPath).catch(() => []);
          const count = entries.filter(e => !e.startsWith(".")).length;
          structure.push(`${prefix}${dir}/ — ${desc} (${count} entries)`);
          break; // don't duplicate if found at root
        }
      } catch {}
    }
  }

  return structure;
}

// ─── Code Pattern Extraction ────────────────────────────────────────────────

/**
 * Extract actual coding patterns from the project.
 * Looks at real code to determine how the project works.
 * @param {string} cwd
 * @param {string[]} stackKeys
 * @returns {Promise<{patterns: string[], antiPatterns: string[], constraints: string[]}>}
 */
export async function extractCodePatterns(cwd, stackKeys) {
  const patterns = [];
  const antiPatterns = [];
  const constraints = [];

  // ── Package.json analysis ─────────────────────────────────────────────
  try {
    const pkg = JSON.parse(await fs.readFile(path.join(cwd, "package.json"), "utf8"));

    // Extract scripts as patterns
    if (pkg.scripts) {
      if (pkg.scripts.dev)   patterns.push(`Dev server: \`${pkg.scripts.dev}\``);
      if (pkg.scripts.build) patterns.push(`Build: \`${pkg.scripts.build}\``);
      if (pkg.scripts.test)  patterns.push(`Tests: \`${pkg.scripts.test}\``);
      if (pkg.scripts.lint)  patterns.push(`Lint: \`${pkg.scripts.lint}\``);
      if (pkg.scripts["db:push"] || pkg.scripts["db:migrate"])
        patterns.push(`DB migrations via npm scripts`);
    }

    // Engine constraints
    if (pkg.engines?.node) constraints.push(`Node.js ${pkg.engines.node} required`);
    if (pkg.type === "module") patterns.push("ES modules (import/export)");
  } catch {}

  // ── Prisma schema analysis ────────────────────────────────────────────
  if (stackKeys.includes("prisma")) {
    try {
      const schema = await fs.readFile(path.join(cwd, "prisma", "schema.prisma"), "utf8");
      const models = schema.match(/^model\s+(\w+)/gm) || [];
      if (models.length > 0) {
        patterns.push(`Prisma models: ${models.map(m => m.replace("model ", "")).join(", ")}`);
      }
      const provider = schema.match(/provider\s*=\s*"(\w+)"/);
      if (provider) patterns.push(`Database: ${provider[1]} (via Prisma)`);

      antiPatterns.push("Never write raw SQL — always use Prisma client");
      constraints.push("Do not manually edit migration files");
    } catch {}
  }

  // ── Drizzle schema analysis ───────────────────────────────────────────
  if (stackKeys.includes("drizzle")) {
    try {
      const drizzleFiles = await glob("**/schema.ts", { cwd, ignore: ["node_modules/**"], absolute: true });
      if (drizzleFiles.length > 0) {
        patterns.push(`Drizzle ORM schema in ${path.relative(cwd, drizzleFiles[0])}`);
        antiPatterns.push("Never write raw SQL — use Drizzle query builder");
      }
    } catch {}
  }

  // ── Middleware analysis ────────────────────────────────────────────────
  const middlewareFiles = await glob("**/middleware.{ts,js}", { cwd, ignore: ["node_modules/**"] });
  if (middlewareFiles.length > 0) {
    for (const mf of middlewareFiles.slice(0, 2)) {
      try {
        const content = await fs.readFile(path.join(cwd, mf), "utf8");
        if (content.includes("clerk") || content.includes("@clerk"))
          patterns.push("Auth: Clerk middleware protects routes");
        else if (content.includes("next-auth") || content.includes("getToken"))
          patterns.push("Auth: NextAuth middleware protects routes");
        else if (content.includes("lucia"))
          patterns.push("Auth: Lucia middleware protects routes");
        else if (content.includes("better-auth"))
          patterns.push("Auth: Better-auth middleware protects routes");
        else
          patterns.push(`Middleware: ${mf}`);
      } catch {}
    }
  }

  // ── Next.js App Router detection ──────────────────────────────────────
  if (stackKeys.includes("nextjs")) {
    const appDir = await dirExists(path.join(cwd, "app")) || await dirExists(path.join(cwd, "src", "app"));
    const pagesDir = await dirExists(path.join(cwd, "pages")) || await dirExists(path.join(cwd, "src", "pages"));

    if (appDir && !pagesDir) patterns.push("Next.js App Router (no Pages Router)");
    else if (appDir && pagesDir) patterns.push("Next.js hybrid: App Router + Pages Router");
    else if (pagesDir) patterns.push("Next.js Pages Router");

    // Check for server actions
    const serverActions = await glob("**/actions/*.{ts,js}", { cwd, ignore: ["node_modules/**"] });
    if (serverActions.length > 0) {
      patterns.push(`Server Actions in ${serverActions.length} files`);
    }

    // Check for API routes
    const apiRoutes = await glob("**/api/**/route.{ts,js}", { cwd, ignore: ["node_modules/**"] });
    if (apiRoutes.length > 0) {
      patterns.push(`${apiRoutes.length} API route handler(s)`);
    }
  }

  // ── Supabase detection ────────────────────────────────────────────────
  if (stackKeys.includes("supabase")) {
    const supabaseDir = await dirExists(path.join(cwd, "supabase"));
    if (supabaseDir) {
      patterns.push("Supabase project with local config");
      const migrations = await glob("supabase/migrations/*.sql", { cwd });
      if (migrations.length > 0) {
        patterns.push(`${migrations.length} Supabase migration(s)`);
        constraints.push("Do not manually edit Supabase migration files");
      }
    }
    antiPatterns.push("Never bypass Row Level Security — all queries must respect RLS policies");
  }

  // ── TypeScript config ─────────────────────────────────────────────────
  if (stackKeys.includes("typescript")) {
    try {
      const tsconfig = await fs.readFile(path.join(cwd, "tsconfig.json"), "utf8");
      const cfg = JSON.parse(tsconfig.replace(/\/\/.*/g, "")); // strip comments
      if (cfg.compilerOptions?.strict) constraints.push("TypeScript strict mode enabled");
      if (cfg.compilerOptions?.paths) {
        const aliases = Object.keys(cfg.compilerOptions.paths);
        if (aliases.length > 0) {
          patterns.push(`Path aliases: ${aliases.slice(0, 5).join(", ")}`);
        }
      }
    } catch {}
  }

  // ── Environment variables ─────────────────────────────────────────────
  const envFiles = await glob(".env*", { cwd, dot: true });
  if (envFiles.length > 0) {
    const envExample = envFiles.find(f => f.includes("example") || f.includes("sample") || f.includes("template"));
    if (envExample) {
      try {
        const content = await fs.readFile(path.join(cwd, envExample), "utf8");
        const vars = content.split("\n").filter(l => l.includes("=") && !l.startsWith("#")).map(l => l.split("=")[0].trim());
        if (vars.length > 0) {
          patterns.push(`Env vars (from ${envExample}): ${vars.slice(0, 8).join(", ")}`);
        }
      } catch {}
    }
    antiPatterns.push("Never hardcode API keys or secrets in source code");
    constraints.push("All secrets via environment variables");
  }

  // ── Testing patterns ──────────────────────────────────────────────────
  if (stackKeys.includes("vitest") || stackKeys.includes("jest")) {
    const testFiles = await glob("**/*.{test,spec}.{ts,tsx,js,jsx}", { cwd, ignore: ["node_modules/**"] });
    if (testFiles.length > 0) {
      patterns.push(`${testFiles.length} test file(s) using ${stackKeys.includes("vitest") ? "Vitest" : "Jest"}`);
    }
  }
  if (stackKeys.includes("playwright")) {
    patterns.push("E2E tests with Playwright");
  }
  if (stackKeys.includes("cypress")) {
    patterns.push("E2E tests with Cypress");
  }

  // ── Tailwind config ───────────────────────────────────────────────────
  if (stackKeys.includes("tailwind")) {
    patterns.push("Styling: Tailwind CSS");
    if (stackKeys.includes("shadcn")) {
      patterns.push("UI components: shadcn/ui (Radix + Tailwind)");
      antiPatterns.push("Don't mix CSS modules with Tailwind — use Tailwind only");
    }
  }

  // ── Docker ────────────────────────────────────────────────────────────
  if (stackKeys.includes("docker")) {
    patterns.push("Dockerized — check Dockerfile for build context");
    const compose = await glob("docker-compose*.{yml,yaml}", { cwd });
    if (compose.length > 0) patterns.push("Docker Compose for local development");
  }

  // ── General anti-patterns ─────────────────────────────────────────────
  antiPatterns.push("Don't commit .env files or secrets to git");

  return { patterns, antiPatterns, constraints };
}

// ─── Existing Documentation Extraction ──────────────────────────────────────

/**
 * Extract context from existing documentation files.
 * Looks for CONTRIBUTING.md, ARCHITECTURE.md, etc.
 * @param {string} cwd
 * @returns {Promise<string[]>} Key points from existing docs
 */
export async function extractExistingDocs(cwd) {
  const docPoints = [];

  const docFiles = [
    "CONTRIBUTING.md",
    "ARCHITECTURE.md",
    "DEVELOPMENT.md",
    "docs/ARCHITECTURE.md",
    "docs/CONTRIBUTING.md",
    "docs/DEVELOPMENT.md",
    ".github/CONTRIBUTING.md",
  ];

  for (const file of docFiles) {
    try {
      const content = await fs.readFile(path.join(cwd, file), "utf8");
      // Extract key headings as doc references
      const headings = content.match(/^## .+/gm) || [];
      if (headings.length > 0) {
        docPoints.push(`${file}: ${headings.slice(0, 3).map(h => h.replace("## ", "")).join(", ")}`);
      }
    } catch {}
  }

  return docPoints;
}

// ─── Skills Content Reader ──────────────────────────────────────────────────

/**
 * Read installed skills and extract their top patterns.
 * Returns compressed patterns from .skills/ for inclusion in agent context.
 * @param {string} cwd
 * @param {number} maxPerSkill
 * @returns {Promise<string[]>}
 */
export async function extractSkillPatterns(cwd, maxPerSkill = 3) {
  const skillPatterns = [];

  try {
    const skillFiles = await glob(".skills/**/*.md", { cwd, absolute: true });

    for (const file of skillFiles) {
      try {
        const content = await fs.readFile(file, "utf8");
        // Skip placeholders
        if (content.includes("<!-- Add best practices") || content.includes("<!-- Add patterns")) continue;

        const relPath = path.relative(path.join(cwd, ".skills"), file);
        const skillName = relPath.replace(/\.md$/, "").replace(/--/g, "/");

        // Extract actual bullet points from ## Patterns section
        const lines = content.split("\n");
        let inPatterns = false;
        let count = 0;

        for (const line of lines) {
          if (line.startsWith("## ")) {
            inPatterns = line.toLowerCase().includes("pattern") || line.toLowerCase().includes("best practice");
            continue;
          }
          if (inPatterns && (line.startsWith("- ") || line.startsWith("* ")) && line.length > 15) {
            skillPatterns.push(`[${skillName}] ${line.slice(2).trim()}`);
            count++;
            if (count >= maxPerSkill) break;
          }
        }
      } catch {}
    }
  } catch {}

  return skillPatterns;
}

// ─── SEED.md Content Reader ─────────────────────────────────────────────────

/**
 * Read existing SEED.md and extract key patterns and constraints.
 * Used by buildBlock() to inline real content into agent context.
 * @param {string} cwd
 * @returns {Promise<{patterns: string[], constraints: string[], antiPatterns: string[]}>}
 */
export async function extractSeedContent(cwd) {
  const result = { patterns: [], constraints: [], antiPatterns: [] };

  try {
    const content = await fs.readFile(path.join(cwd, "SPECS", "SEED.md"), "utf8");
    const lines = content.split("\n");
    let currentSection = null;

    for (const line of lines) {
      if (line.startsWith("## ")) {
        const lower = line.toLowerCase();
        if (lower.includes("pattern") && !lower.includes("anti")) currentSection = "patterns";
        else if (lower.includes("anti-pattern") || lower.includes("forbidden")) currentSection = "antiPatterns";
        else if (lower.includes("constraint")) currentSection = "constraints";
        else currentSection = null;
        continue;
      }

      if (currentSection && (line.startsWith("- ") || line.startsWith("* "))) {
        const text = line.slice(2).trim();
        // Skip template placeholders
        if (text.startsWith("<!--") || text.length < 10) continue;
        result[currentSection].push(text);
      }
    }
  } catch {}

  return result;
}

// ─── Full Context Extraction ────────────────────────────────────────────────

/**
 * Run all extractors and return a unified context object.
 * This is the main entry point called by init.js.
 *
 * @param {string} cwd
 * @param {string[]} stackKeys
 * @returns {Promise<ExtractedContext>}
 */
export async function extractProjectContext(cwd, stackKeys) {
  const [
    readme,
    fileStructure,
    codePatterns,
    existingDocs,
    skillPatterns,
  ] = await Promise.all([
    extractReadmeSummary(cwd),
    extractFileStructure(cwd),
    extractCodePatterns(cwd, stackKeys),
    extractExistingDocs(cwd),
    extractSkillPatterns(cwd),
  ]);

  return {
    readme,
    fileStructure,
    patterns: codePatterns.patterns,
    antiPatterns: codePatterns.antiPatterns,
    constraints: codePatterns.constraints,
    existingDocs,
    skillPatterns,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function dirExists(p) {
  try {
    const stat = await fs.stat(p);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * @typedef {Object} ExtractedContext
 * @property {string|null}  readme         - Project description from README
 * @property {string[]}     fileStructure  - Directory descriptions
 * @property {string[]}     patterns       - Detected code patterns
 * @property {string[]}     antiPatterns   - Detected anti-patterns
 * @property {string[]}     constraints    - Hard constraints
 * @property {string[]}     existingDocs   - References to existing docs
 * @property {string[]}     skillPatterns  - Patterns from installed skills
 */
