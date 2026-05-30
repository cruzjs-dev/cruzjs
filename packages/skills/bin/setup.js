#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatesDir = join(__dirname, '..', 'templates');
const projectRoot = process.cwd();

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';

function log(msg) { console.log(msg); }
function success(msg) { log(`${GREEN}✓${RESET} ${msg}`); }
function warn(msg) { log(`${YELLOW}⚠${RESET} ${msg}`); }

const HARNESSES = {
  'claude-code': {
    name: 'Claude Code',
    description: '.claude/ commands, KB, agents, CLAUDE.md',
  },
  'cursor': {
    name: 'Cursor',
    description: '.cursor/rules/*.mdc with frontmatter',
  },
  'codex': {
    name: 'Codex (OpenAI)',
    description: 'AGENTS.md + .agents/skills/',
  },
  'opencode': {
    name: 'OpenCode',
    description: 'AGENTS.md + .opencode/skills/',
  },
  'antigravity': {
    name: 'Antigravity (Google)',
    description: 'GEMINI.md + .agent/rules/ + .agent/skills/',
  },
};

async function prompt(question, options) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    log('');
    log(`${BOLD}${question}${RESET}`);
    options.forEach((opt, i) => {
      log(`  ${CYAN}${i + 1}${RESET}) ${opt.label}  ${DIM}${opt.desc}${RESET}`);
    });
    log('');
    rl.question(`Choose (1-${options.length}, comma-separated for multiple): `, (answer) => {
      rl.close();
      const indices = answer.split(',').map(s => parseInt(s.trim()) - 1).filter(i => i >= 0 && i < options.length);
      resolve(indices.length ? indices.map(i => options[i].value) : [options[0].value]);
    });
  });
}

function readTemplate(relPath) {
  return readFileSync(join(templatesDir, relPath), 'utf-8');
}

function listFiles(dir, ext) {
  const full = join(templatesDir, dir);
  if (!existsSync(full)) return [];
  return readdirSync(full).filter(f => !ext || f.endsWith(ext)).map(f => ({
    name: f.replace(/\.[^.]+$/, ''),
    path: join(dir, f),
    content: readFileSync(join(full, f), 'utf-8'),
  }));
}

function ensureDir(path) {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
}

function writeOut(relPath, content) {
  const full = join(projectRoot, relPath);
  ensureDir(dirname(full));
  writeFileSync(full, content);
}

// ─── Claude Code ───────────────────────────────────────────
function initClaudeCode(force) {
  log(`\n${BOLD}Setting up Claude Code${RESET}`);

  const dirs = ['.claude/commands', '.claude/kb', '.claude/agents/personas', '.claude/agents/shared', '.claude/agents/workflows'];
  dirs.forEach(d => ensureDir(join(projectRoot, d)));

  cpSync(join(templatesDir, 'commands'), join(projectRoot, '.claude/commands'), { recursive: true, force });
  success('commands/ (13 skills)');

  cpSync(join(templatesDir, 'kb'), join(projectRoot, '.claude/kb'), { recursive: true, force });
  success('kb/ (27 docs)');

  cpSync(join(templatesDir, 'agents/personas'), join(projectRoot, '.claude/agents/personas'), { recursive: true, force });
  success('agents/personas/ (7)');

  cpSync(join(templatesDir, 'agents/shared'), join(projectRoot, '.claude/agents/shared'), { recursive: true, force });
  success('agents/shared/');

  cpSync(join(templatesDir, 'agents/workflows'), join(projectRoot, '.claude/agents/workflows'), { recursive: true, force });
  success('agents/workflows/');

  const claudeMd = join(projectRoot, 'CLAUDE.md');
  if (!existsSync(claudeMd) || force) {
    cpSync(join(templatesDir, 'CLAUDE.md'), claudeMd);
    success('CLAUDE.md');
  }
}

// ─── Cursor ────────────────────────────────────────────────
function initCursor(force) {
  log(`\n${BOLD}Setting up Cursor${RESET}`);
  ensureDir(join(projectRoot, '.cursor/rules'));

  const claudeMd = readTemplate('CLAUDE.md');
  writeOut('.cursor/rules/cruz-project.mdc', mdcWrap({
    description: 'CruzJS project instructions, CLI reference, and architecture patterns',
    alwaysApply: true,
  }, claudeMd));
  success('cruz-project.mdc (project instructions, always active)');

  const kbFiles = listFiles('kb', '.md');
  const coreKb = kbFiles.filter(f => /^0[0-8]/.test(f.name));
  const extKb = kbFiles.filter(f => !/^0[0-8]/.test(f.name));

  for (const f of coreKb) {
    writeOut(`.cursor/rules/cruz-kb-${f.name}.mdc`, mdcWrap({
      description: `CruzJS KB: ${titleFromContent(f.content)}`,
      alwaysApply: true,
    }, f.content));
  }
  success(`core KB rules (${coreKb.length} always-on)`);

  for (const f of extKb) {
    const globs = inferGlobs(f.name);
    writeOut(`.cursor/rules/cruz-kb-${f.name}.mdc`, mdcWrap({
      description: `CruzJS KB: ${titleFromContent(f.content)}`,
      ...(globs ? { globs } : {}),
    }, f.content));
  }
  success(`extended KB rules (${extKb.length} auto-attached)`);

  const commands = listFiles('commands', '.md');
  for (const cmd of commands) {
    writeOut(`.cursor/rules/cruz-cmd-${cmd.name}.mdc`, mdcWrap({
      description: `CruzJS command: ${cmd.name} — ${descFromContent(cmd.content)}`,
    }, cmd.content));
  }
  success(`command rules (${commands.length}, agent-requested)`);

  const personas = listFiles('agents/personas', '.md');
  for (const p of personas) {
    writeOut(`.cursor/rules/cruz-agent-${p.name}.mdc`, mdcWrap({
      description: `CruzJS agent persona: ${p.name}`,
    }, p.content));
  }
  success(`agent persona rules (${personas.length})`);
}

// ─── Codex (OpenAI) ────────────────────────────────────────
function initCodex(force) {
  log(`\n${BOLD}Setting up Codex${RESET}`);

  const claudeMd = readTemplate('CLAUDE.md');
  const agentsMd = join(projectRoot, 'AGENTS.md');
  if (!existsSync(agentsMd) || force) {
    writeOut('AGENTS.md', claudeMd);
    success('AGENTS.md (project instructions)');
  }

  ensureDir(join(projectRoot, '.agents/skills'));

  const commands = listFiles('commands', '.md');
  for (const cmd of commands) {
    writeOut(`.agents/skills/${cmd.name}/SKILL.md`, cmd.content);
  }
  success(`skills (${commands.length} commands)`);

  const kbFiles = listFiles('kb', '.md');
  ensureDir(join(projectRoot, '.agents/kb'));
  for (const f of kbFiles) {
    writeOut(`.agents/kb/${f.name}.md`, f.content);
  }
  success(`knowledge base (${kbFiles.length} docs in .agents/kb/)`);
}

// ─── OpenCode ──────────────────────────────────────────────
function initOpenCode(force) {
  log(`\n${BOLD}Setting up OpenCode${RESET}`);

  const claudeMd = readTemplate('CLAUDE.md');
  const agentsMd = join(projectRoot, 'AGENTS.md');
  if (!existsSync(agentsMd) || force) {
    writeOut('AGENTS.md', claudeMd);
    success('AGENTS.md (project instructions)');
  }

  const commands = listFiles('commands', '.md');
  for (const cmd of commands) {
    writeOut(`.opencode/skills/${cmd.name}/SKILL.md`, cmd.content);
  }
  success(`skills (${commands.length} commands)`);

  const kbFiles = listFiles('kb', '.md');
  const kbPaths = kbFiles.map(f => `.opencode/kb/${f.name}.md`);
  for (const f of kbFiles) {
    writeOut(`.opencode/kb/${f.name}.md`, f.content);
  }
  success(`knowledge base (${kbFiles.length} docs)`);

  const personas = listFiles('agents/personas', '.md');
  for (const p of personas) {
    writeOut(`.opencode/agents/${p.name}.md`, p.content);
  }
  success(`agents (${personas.length} personas)`);

  const configPath = join(projectRoot, 'opencode.json');
  if (!existsSync(configPath) || force) {
    writeOut('opencode.json', JSON.stringify({
      '$schema': 'https://opencode.ai/config.json',
      instructions: [
        'AGENTS.md',
        ...kbPaths,
      ],
    }, null, 2) + '\n');
    success('opencode.json (config with KB references)');
  }
}

// ─── Antigravity (Google) ──────────────────────────────────
function initAntigravity(force) {
  log(`\n${BOLD}Setting up Antigravity${RESET}`);

  const claudeMd = readTemplate('CLAUDE.md');
  const geminiMd = join(projectRoot, 'GEMINI.md');
  if (!existsSync(geminiMd) || force) {
    writeOut('GEMINI.md', claudeMd);
    success('GEMINI.md (project instructions)');
  }

  const kbFiles = listFiles('kb', '.md');
  for (const f of kbFiles) {
    writeOut(`.agent/rules/${f.name}.md`, f.content);
  }
  success(`rules (${kbFiles.length} KB docs in .agent/rules/)`);

  const commands = listFiles('commands', '.md');
  for (const cmd of commands) {
    const desc = descFromContent(cmd.content);
    const skillContent = `---\nname: ${cmd.name}\ndescription: ${desc}\n---\n\n${cmd.content}`;
    writeOut(`.agent/skills/${cmd.name}/SKILL.md`, skillContent);
  }
  success(`skills (${commands.length} commands)`);
}

// ─── Helpers ───────────────────────────────────────────────
function mdcWrap(frontmatter, content) {
  const lines = [];
  lines.push('---');
  if (frontmatter.description) lines.push(`description: "${frontmatter.description.replace(/"/g, '\\"')}"`);
  if (frontmatter.globs) lines.push(`globs: ${JSON.stringify(frontmatter.globs)}`);
  if (frontmatter.alwaysApply) lines.push('alwaysApply: true');
  lines.push('---');
  lines.push('');
  lines.push(content);
  return lines.join('\n');
}

function titleFromContent(content) {
  const match = content.match(/^#\s+(.+)/m);
  return match ? match[1].trim().substring(0, 80) : 'CruzJS documentation';
}

function descFromContent(content) {
  let text = content;
  if (text.startsWith('---')) {
    const end = text.indexOf('---', 3);
    if (end > 0) text = text.slice(end + 3);
  }
  const lines = text.split('\n').filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('---') && !l.startsWith('import'));
  return (lines[0] || 'CruzJS skill').trim().substring(0, 100).replace(/"/g, "'");
}

function inferGlobs(kbName) {
  const map = {
    '09-EVENTS': ['**/events/**', '**/*.event.ts'],
    '10-TESTING': ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts'],
    '12-JOBS': ['**/jobs/**', '**/*.job.ts'],
    '13-DEPLOYMENT': ['**/wrangler.toml', '**/cruz.config.*'],
    '15-RUNTIME-ADAPTERS': ['**/adapter-*/**'],
    '16-SOCIAL-AUTH': ['**/auth/**', '**/oauth/**'],
    '17-NOTIFICATIONS': ['**/notifications/**'],
    '18-CRUD': ['**/crud/**', '**/*.crud.ts'],
    '19-LOGGING': ['**/logging/**', '**/*.log.*'],
  };
  return map[kbName] || null;
}

const INIT_FNS = {
  'claude-code': initClaudeCode,
  'cursor': initCursor,
  'codex': initCodex,
  'opencode': initOpenCode,
  'antigravity': initAntigravity,
};

// ─── Main ──────────────────────────────────────────────────
async function main() {
  const command = process.argv[2] || 'init';
  const force = command === 'update' || process.argv.includes('--force');

  const flagHarness = process.argv.find(a => a.startsWith('--harness='));
  let selectedKeys;

  if (flagHarness) {
    selectedKeys = flagHarness.split('=')[1].split(',').filter(k => HARNESSES[k]);
  }

  if (command === '--help' || command === '-h') {
    log(`
${BOLD}@cruzjs/skills${RESET} — AI coding assistant commands & knowledge base for CruzJS

${BOLD}Usage:${RESET}
  npx @cruzjs/skills init                    Interactive setup
  npx @cruzjs/skills init --harness=cursor   Non-interactive, specific harness
  npx @cruzjs/skills update                  Overwrite with latest
  npx @cruzjs/skills --help                  Show this help

${BOLD}Supported harnesses:${RESET}
  claude-code    Claude Code (.claude/)
  cursor         Cursor IDE (.cursor/rules/)
  codex          OpenAI Codex CLI (AGENTS.md + .agents/)
  opencode       OpenCode CLI (AGENTS.md + .opencode/)
  antigravity    Google Antigravity (GEMINI.md + .agent/)
`);
    return;
  }

  log('');
  log(`${BOLD}${CYAN}@cruzjs/skills${RESET} — AI-assisted CruzJS development`);

  if (!selectedKeys) {
    const options = Object.entries(HARNESSES).map(([key, h]) => ({
      value: key,
      label: h.name,
      desc: h.description,
    }));

    selectedKeys = await prompt('Which AI coding tool(s) are you using?', options);
  }

  // Always install canonical KB at .cruzjs/knowledgebase/ — harness-neutral source of truth
  installCanonicalKB(force);

  for (const key of selectedKeys) {
    INIT_FNS[key](force);
  }

  log('');
  log(`${BOLD}${GREEN}Done!${RESET} Initialized for: ${selectedKeys.map(k => HARNESSES[k].name).join(', ')}`);
  printNotice(selectedKeys);
  printCommandList();
}

function installCanonicalKB(force) {
  log(`\n${BOLD}Installing canonical KB${RESET}`);
  ensureDir(join(projectRoot, '.cruzjs/knowledgebase'));
  cpSync(join(templatesDir, 'kb'), join(projectRoot, '.cruzjs/knowledgebase'), { recursive: true, force });
  success('.cruzjs/knowledgebase/ (canonical KB — harness-neutral)');

  const cmdsTarget = join(projectRoot, '.cruzjs/commands');
  ensureDir(cmdsTarget);
  cpSync(join(templatesDir, 'commands'), cmdsTarget, { recursive: true, force });
  success('.cruzjs/commands/ (canonical commands)');
}

function printNotice(selectedKeys) {
  const projectDocs = {
    'claude-code': 'CLAUDE.md',
    'cursor': '.cursor/rules/cruz-project.mdc',
    'codex': 'AGENTS.md',
    'opencode': 'AGENTS.md',
    'antigravity': 'GEMINI.md',
  };
  const docs = [...new Set(selectedKeys.map(k => projectDocs[k]).filter(Boolean))];

  log('');
  log(`${BOLD}${YELLOW}⚠ IMPORTANT:${RESET} Update your project doc${docs.length > 1 ? 's' : ''} so the AI follows CruzJS patterns.`);
  log('');
  log(`  Edit ${docs.map(d => `${CYAN}${d}${RESET}`).join(' or ')} and add:`);
  log('');
  log(`    ${DIM}## Mandatory reads (before writing code)${RESET}`);
  log(`    ${DIM}- Building a feature?    Read .cruzjs/knowledgebase/00-COOKBOOK.md${RESET}`);
  log(`    ${DIM}- Writing a service?     Read .cruzjs/knowledgebase/03-DI-INVERSIFY.md${RESET}`);
  log(`    ${DIM}- Adding an endpoint?    Read .cruzjs/knowledgebase/05-TRPC-ROUTERS.md${RESET}`);
  log(`    ${DIM}- Before ANY code:       Read .cruzjs/knowledgebase/99-ANTI-PATTERNS.md${RESET}`);
  log('');
  log(`  Without this, the AI will skip the KB and write framework-violating code.`);
}

function printCommandList() {
  log('');
  log(`${BOLD}Available skills:${RESET}`);
  log(`  ${CYAN}/dev${RESET}                  Full autonomous dev pipeline`);
  log(`  ${CYAN}/new-feature${RESET}          Create a feature module`);
  log(`  ${CYAN}/add${RESET}                  Add field/event/test to existing feature`);
  log(`  ${CYAN}/debug${RESET}                Diagnose and fix issues`);
  log(`  ${CYAN}/fix-lint${RESET}             Fix TypeScript/lint errors`);
  log(`  ${CYAN}/code-review${RESET}          Automated code review`);
  log(`  ${CYAN}/qa${RESET}                   Automated QA testing`);
  log(`  ${CYAN}/create-ui-component${RESET}  Build UI component with Storybook`);
  log(`  ${CYAN}/build-application${RESET}    Interactive app builder wizard`);
  log(`  ${CYAN}/pm${RESET}                   Product spec from feature request`);
  log(`  ${CYAN}/architect${RESET}            Implementation plan from spec`);
  log(`  ${CYAN}/new-ui${RESET}               Create UI for existing feature`);
  log(`  ${CYAN}/roadmap${RESET}              Execute MASTER_PLAN.md tasks`);
  log('');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
