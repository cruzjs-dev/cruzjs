/**
 * cruz routes -- List all registered tRPC procedures and React Router page routes.
 *
 * Performs static file analysis (no Cloudflare worker needed).
 * Scans *.trpc.ts files for procedure definitions and *.routes.ts / route
 * registration files for page routes.
 *
 * Bypasses Ink -- writes directly to stdout.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ── Types ────────────────────────────────────────────────────────────────────

export interface RoutesCommandOptions {
  projectRoot: string;
  json?: boolean;
  filter?: string;
}

interface TrpcProcedure {
  type: 'query' | 'mutation' | 'subscription';
  route: string;
  auth: string;
  file: string;
}

interface PageRoute {
  path: string;
  component: string;
}

interface RoutesOutput {
  trpc: TrpcProcedure[];
  pages: PageRoute[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function isMonorepo(rootDir: string): boolean {
  const monorepoSrc = path.resolve(rootDir, 'apps', 'web', 'src');
  const entryFiles = ['server.cloudflare.ts', 'entry.server.tsx', 'root.tsx', 'routes.ts'];
  return entryFiles.some((f) => fs.existsSync(path.resolve(monorepoSrc, f)));
}

/** Recursively find files matching a suffix in a directory. */
function findFiles(dir: string, suffix: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFiles(fullPath, suffix));
    } else if (entry.name.endsWith(suffix)) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Classify a procedure type string to an auth level label.
 * Maps e.g. `orgProcedure` -> `org`, `protectedProcedure` -> `protected`.
 */
function classifyAuth(procedureStr: string): string {
  if (/^public/i.test(procedureStr)) return 'public';
  if (/^org/i.test(procedureStr)) return 'org';
  if (/^protected/i.test(procedureStr)) return 'protected';
  // Custom procedures (apiKeyProcedure, paginatedProcedure, etc.)
  return procedureStr.replace(/Procedure$/, '');
}

// ── tRPC Procedure Parsing ───────────────────────────────────────────────────

/**
 * Extract procedure definitions from a tRPC router file.
 *
 * Handles two patterns:
 * 1. Function-based routers: `router({ name: someProcedure.query(...)  })`
 * 2. OOP class-based routers: `@Route() name = someProcedure.query(...)`
 */
function parseTrpcFile(filePath: string): Array<{ name: string; type: string; auth: string }> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const procedures: Array<{ name: string; type: string; auth: string }> = [];

  // Pattern 1: OOP class-based — @Route() name = someProcedure...
  // Matches: @Route() procedureName = publicProcedure.query(...)
  //          @Route() procedureName = protectedProcedure\n  .mutation(...)
  const oopRouteRegex = /@Route\(\)\s+(\w+)\s*=\s*(\w+Procedure)\b/g;
  let match: RegExpExecArray | null;

  while ((match = oopRouteRegex.exec(content)) !== null) {
    const name = match[1];
    const procedureType = match[2];
    // Look ahead for .query( / .mutation( / .subscription( — use a generous window
    // to handle multi-line .input() blocks with nested parens.
    const afterMatch = content.slice(match.index + match[0].length, match.index + match[0].length + 2000);
    const typeMatch = afterMatch.match(/\.(query|mutation|subscription)\s*\(/);
    const type = typeMatch ? typeMatch[1] : 'query';
    procedures.push({ name, type, auth: classifyAuth(procedureType) });
  }

  // Pattern 2: Function-based — router({ name: someProcedure.query(...) })
  // We need to detect `export const xxxTrpc = router({` and then parse the keys
  const routerBlockRegex = /=\s*router\(\s*\{([\s\S]*?)\n\}\s*\)/g;
  let routerMatch: RegExpExecArray | null;

  while ((routerMatch = routerBlockRegex.exec(content)) !== null) {
    const block = routerMatch[1];
    // Match procedure keys within the block. Handle multiline like:
    //   procedureName: someProcedure\n    .input(...)\n    .query(...)
    //   procedureName: someProcedure.query(...)
    const keyRegex = /^\s*(\w+)\s*:\s*(\w+Procedure)\b/gm;
    let keyMatch: RegExpExecArray | null;

    while ((keyMatch = keyRegex.exec(block)) !== null) {
      const name = keyMatch[1];
      const procedureType = keyMatch[2];
      // Look ahead for .query( / .mutation( / .subscription( — generous window
      const afterKey = block.slice(keyMatch.index + keyMatch[0].length, keyMatch.index + keyMatch[0].length + 2000);
      const typeMatch = afterKey.match(/\.(query|mutation|subscription)\s*\(/);
      const type = typeMatch ? typeMatch[1] : 'query';
      procedures.push({ name, type, auth: classifyAuth(procedureType) });
    }
  }

  return procedures;
}

/**
 * Parse all module files to build a map of tRPC file -> router prefix name.
 *
 * Scans @Module({ trpcRouters: { routerName: routerRef } }) patterns.
 * Returns a map from the imported variable name to the router key in the module.
 */
function buildRouterNameMap(
  moduleFiles: string[],
): Map<string, { routerName: string; moduleFile: string }> {
  const map = new Map<string, { routerName: string; moduleFile: string }>();

  for (const moduleFile of moduleFiles) {
    if (!fs.existsSync(moduleFile)) continue;
    const content = fs.readFileSync(moduleFile, 'utf-8');

    // Find trpcRouters block
    const trpcRoutersMatch = content.match(/trpcRouters\s*:\s*\{([^}]+)\}/);
    if (!trpcRoutersMatch) continue;

    const block = trpcRoutersMatch[1];
    // Parse entries like: routerName: routerRef,
    const entryRegex = /(\w+)\s*:\s*(\w+)/g;
    let entryMatch: RegExpExecArray | null;

    while ((entryMatch = entryRegex.exec(block)) !== null) {
      const routerName = entryMatch[1];
      const routerRef = entryMatch[2];
      map.set(routerRef, { routerName, moduleFile });
    }
  }

  return map;
}

/**
 * Resolve which router prefix name a .trpc.ts file corresponds to.
 * Falls back to inferring from the filename.
 */
function resolveRouterPrefix(
  trpcFilePath: string,
  routerNameMap: Map<string, { routerName: string }>,
  content: string,
): string {
  // Check if any exported variable from this file is in the router name map.
  // The export names are patterns like: `export const xxxTrpc = router(...)` or `export class XxxTrpc`
  const exportedConst = content.match(/export\s+(?:const|let)\s+(\w+)\s*=/);
  const exportedClass = content.match(/export\s+class\s+(\w+)/);

  const exportName = exportedConst?.[1] || exportedClass?.[1];
  if (exportName && routerNameMap.has(exportName)) {
    return routerNameMap.get(exportName)!.routerName;
  }

  // Fallback: infer from filename. E.g., auth.trpc.ts -> auth
  const basename = path.basename(trpcFilePath, '.trpc.ts');
  // Convert kebab-case to camelCase
  return basename.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

// ── Page Route Parsing ───────────────────────────────────────────────────────

/**
 * Parse page routes from the various route registration sources.
 *
 * Sources:
 * 1. Core routes (core-routes.ts)
 * 2. Framework registrar routes (start-routes.ts, saas-routes.ts)
 * 3. Module pageRoutes (*.routes.ts files)
 * 4. App routes.ts inline routes
 */
function parsePageRoutes(projectRoot: string, mono: boolean): PageRoute[] {
  const routes: PageRoute[] = [];

  const packagesDir = path.join(projectRoot, 'packages');
  const srcDir = mono
    ? path.join(projectRoot, 'apps', 'web', 'src')
    : path.join(projectRoot, 'src');

  // 1. Parse core-routes.ts
  const coreRoutesFile = path.join(packagesDir, 'core', 'src', 'routing', 'core-routes.ts');
  if (fs.existsSync(coreRoutesFile)) {
    routes.push(...parseRouteRegistrar(coreRoutesFile, '@cruzjs/core'));
  }

  // 2. Parse start-routes.ts
  const startRoutesFile = path.join(packagesDir, 'start', 'src', 'routing', 'start-routes.ts');
  if (fs.existsSync(startRoutesFile)) {
    routes.push(...parseRouteRegistrar(startRoutesFile, '@cruzjs/start'));
  }

  // 3. Parse saas-routes.ts (from saas or pro package)
  for (const pkg of ['saas', 'pro']) {
    const proRoutesFile = path.join(packagesDir, pkg, 'src', 'routing', 'saas-routes.ts');
    if (fs.existsSync(proRoutesFile)) {
      routes.push(...parseRouteRegistrar(proRoutesFile, `@cruzjs/${pkg}`));
      break; // Only parse one
    }
  }

  // 4. Parse *.routes.ts files from packages (module pageRoutes)
  const routesFiles = [
    ...findFiles(path.join(packagesDir, 'core', 'src'), '.routes.ts'),
    ...findFiles(path.join(packagesDir, 'start', 'src'), '.routes.ts'),
    ...findFiles(path.join(packagesDir, 'saas', 'src'), '.routes.ts'),
    ...findFiles(path.join(packagesDir, 'pro', 'src'), '.routes.ts'),
  ].filter(f => !f.includes('/routing/'));

  for (const file of routesFiles) {
    routes.push(...parseModuleRouteFile(file, projectRoot));
  }

  // 5. Parse app-level routes.ts
  const appRoutesFile = path.join(srcDir, 'routes.ts');
  if (fs.existsSync(appRoutesFile)) {
    routes.push(...parseAppRoutes(appRoutesFile, projectRoot));
  }

  // 6. Scan for feature route files in app
  const featureRoutesFiles = findFiles(path.join(srcDir, 'features'), '.routes.ts');
  for (const file of featureRoutesFiles) {
    routes.push(...parseModuleRouteFile(file, projectRoot));
  }

  return routes;
}

/**
 * Parse a route registrar file (core-routes.ts, start-routes.ts, saas-routes.ts).
 * Extracts `{ path: 'xxx', file: r('yyy') }` patterns.
 */
function parseRouteRegistrar(filePath: string, pkgName: string): PageRoute[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const routes: PageRoute[] = [];

  // Match patterns like: { path: 'auth/login', file: r('auth/pages/LoginPage.tsx') }
  const pathFileRegex = /\{\s*path:\s*'([^']+)'\s*,\s*(?:file:\s*r\('([^']+)'\)|file:\s*'([^']+)')/g;
  let match: RegExpExecArray | null;

  while ((match = pathFileRegex.exec(content)) !== null) {
    const routePath = '/' + match[1];
    const file = match[2] || match[3];
    const component = match[2] ? `${pkgName}/src/${file}` : file;
    routes.push({ path: routePath, component });
  }

  // Match standalone helpers.route() calls
  // helpers.route('path', r('file')) or helpers.route('path', file)
  const helperRouteRegex = /helpers\.route\(\s*'([^']+)'\s*,\s*(?:r\('([^']+)'\)|helpers\.resolvePackageFile\([^,]+,\s*'([^']+)'\)|'([^']+)')/g;
  while ((match = helperRouteRegex.exec(content)) !== null) {
    const routePath = '/' + match[1];
    const file = match[2] || match[3] || match[4];
    const component = (match[2] || match[3]) ? `${pkgName}/src/${file}` : file;
    // Avoid duplicates
    if (!routes.some(r => r.path === routePath)) {
      routes.push({ path: routePath, component });
    }
  }

  return routes;
}

/**
 * Parse a module's .routes.ts file for route definitions.
 * Matches helpers.route('path', 'file') and helpers.prefix('prefix', [...]) patterns.
 */
function parseModuleRouteFile(filePath: string, projectRoot: string): PageRoute[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const routes: PageRoute[] = [];
  const relFile = path.relative(projectRoot, filePath);

  // Detect PKG constant
  const pkgMatch = content.match(/const\s+PKG\s*=\s*'([^']+)'/);
  const pkg = pkgMatch ? pkgMatch[1] : undefined;

  // Find helpers.prefix('prefix', [...]) to establish context
  const prefixMatch = content.match(/helpers\.prefix\(\s*'([^']+)'/);
  const prefixPath = prefixMatch ? prefixMatch[1] : '';

  // Match helpers.route('path', helpers.resolvePackageFile(PKG, 'file'))
  const routePatternPkg = /helpers\.route\(\s*'([^']+)'\s*,\s*helpers\.resolvePackageFile\(\s*PKG\s*,\s*'([^']+)'\s*\)/g;
  let match: RegExpExecArray | null;

  while ((match = routePatternPkg.exec(content)) !== null) {
    const routePath = '/' + match[1];
    const file = match[2];
    const component = pkg ? `${pkg}/src/${file}` : file;
    routes.push({ path: routePath, component });
  }

  // Match helpers.route('path', 'file')
  const routePatternDirect = /helpers\.route\(\s*'([^']+)'\s*,\s*'([^']+)'\s*\)/g;
  while ((match = routePatternDirect.exec(content)) !== null) {
    const routePath = '/' + (prefixPath ? prefixPath + '/' : '') + match[1];
    const file = match[2];
    routes.push({ path: routePath, component: file });
  }

  // Match helpers.index('file')
  const indexPattern = /helpers\.index\(\s*'([^']+)'\s*\)/g;
  while ((match = indexPattern.exec(content)) !== null) {
    const routePath = '/' + prefixPath;
    routes.push({ path: routePath || '/', component: match[1] });
  }

  return routes;
}

/**
 * Parse the app-level routes.ts file for inline route definitions.
 * Matches route('path', 'file'), index('file'), and ...prefix('prefix', [...]) patterns.
 *
 * Strategy: first identify prefix block ranges so we can skip them when
 * scanning for top-level route()/index() calls.
 */
function parseAppRoutes(filePath: string, projectRoot: string): PageRoute[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const routes: PageRoute[] = [];

  // 1. Find prefix blocks and record their ranges + extract prefixed routes
  const prefixRanges: Array<{ start: number; end: number }> = [];
  const prefixRegex = /\.\.\.prefix\(\s*'([^']+)'\s*,\s*\[([\s\S]*?)\]\s*\)/g;
  let match: RegExpExecArray | null;

  while ((match = prefixRegex.exec(content)) !== null) {
    prefixRanges.push({ start: match.index, end: match.index + match[0].length });

    const prefix = match[1];
    const block = match[2];

    // Find index() within the prefix block
    const innerIndexRegex = /index\(\s*'([^']+)'\s*\)/g;
    let innerMatch: RegExpExecArray | null;
    while ((innerMatch = innerIndexRegex.exec(block)) !== null) {
      routes.push({ path: '/' + prefix, component: innerMatch[1] });
    }

    // Find route() within the prefix block
    const innerRouteRegex = /route\(\s*'([^']+)'\s*,\s*'([^']+)'\s*\)/g;
    while ((innerMatch = innerRouteRegex.exec(block)) !== null) {
      routes.push({ path: '/' + prefix + '/' + innerMatch[1], component: innerMatch[2] });
    }
  }

  const isInsidePrefix = (pos: number) =>
    prefixRanges.some((r) => pos >= r.start && pos < r.end);

  // 2. Match top-level index('file') — not inside prefix blocks
  const indexRegex = /index\(\s*'([^']+)'\s*\)/g;
  while ((match = indexRegex.exec(content)) !== null) {
    if (!isInsidePrefix(match.index)) {
      routes.push({ path: '/', component: match[1] });
    }
  }

  // 3. Match top-level route('path', 'file') — not inside prefix blocks
  const routeRegex = /route\(\s*'([^']+)'\s*,\s*'([^']+)'\s*\)/g;
  while ((match = routeRegex.exec(content)) !== null) {
    if (!isInsidePrefix(match.index)) {
      routes.push({ path: '/' + match[1], component: match[2] });
    }
  }

  return routes;
}

// ── Output Formatting ────────────────────────────────────────────────────────

function printTable(procedures: TrpcProcedure[], pages: PageRoute[]): void {
  // ── tRPC Procedures ──
  console.log('');
  console.log('tRPC Procedures');
  console.log('\x1b[90m' + '─'.repeat(90) + '\x1b[0m');

  if (procedures.length === 0) {
    console.log('  (none found)');
  } else {
    // Column widths
    const typeWidth = Math.max(10, ...procedures.map(p => p.type.length + 2));
    const routeWidth = Math.max(26, ...procedures.map(p => p.route.length + 2));
    const authWidth = Math.max(12, ...procedures.map(p => p.auth.length + 2));

    // Header
    console.log(
      `  ${'TYPE'.padEnd(typeWidth)}${'ROUTE'.padEnd(routeWidth)}${'AUTH'.padEnd(authWidth)}FILE`,
    );

    for (const proc of procedures) {
      const typeColor = proc.type === 'mutation' ? '\x1b[33m' : '\x1b[36m';
      const authColor =
        proc.auth === 'public'
          ? '\x1b[32m'
          : proc.auth === 'org'
            ? '\x1b[35m'
            : '\x1b[34m';

      console.log(
        `  ${typeColor}${proc.type.padEnd(typeWidth)}\x1b[0m${proc.route.padEnd(routeWidth)}${authColor}${proc.auth.padEnd(authWidth)}\x1b[0m\x1b[90m${proc.file}\x1b[0m`,
      );
    }
  }

  // ── Page Routes ──
  console.log('');
  console.log('Page Routes');
  console.log('\x1b[90m' + '─'.repeat(90) + '\x1b[0m');

  if (pages.length === 0) {
    console.log('  (none found)');
  } else {
    const pathWidth = Math.max(30, ...pages.map(p => p.path.length + 2));

    console.log(`  ${'PATH'.padEnd(pathWidth)}COMPONENT`);

    for (const page of pages) {
      console.log(
        `  \x1b[36m${page.path.padEnd(pathWidth)}\x1b[0m\x1b[90m${page.component}\x1b[0m`,
      );
    }
  }

  console.log('');
  console.log(
    `\x1b[90m${procedures.length} tRPC procedure(s), ${pages.length} page route(s)\x1b[0m`,
  );
  console.log('');
}

// ── Main ─────────────────────────────────────────────────────────────────────

export async function routesCommand(options: RoutesCommandOptions): Promise<void> {
  const { projectRoot, json = false, filter } = options;
  const mono = isMonorepo(projectRoot);

  const packagesDir = path.join(projectRoot, 'packages');
  const srcDir = mono
    ? path.join(projectRoot, 'apps', 'web', 'src')
    : path.join(projectRoot, 'src');

  // ── Scan directories for .trpc.ts and .module.ts files ──

  const trpcDirs = [
    path.join(packagesDir, 'core', 'src'),
    path.join(packagesDir, 'start', 'src'),
    path.join(packagesDir, 'saas', 'src'),
    path.join(packagesDir, 'pro', 'src'),
    path.join(packagesDir, 'monitor', 'src'),
    path.join(srcDir, 'features'),
  ];

  const trpcFiles: string[] = [];
  const moduleFiles: string[] = [];

  for (const dir of trpcDirs) {
    trpcFiles.push(...findFiles(dir, '.trpc.ts'));
    moduleFiles.push(...findFiles(dir, '.module.ts'));
  }

  // Build router name map from modules
  const routerNameMap = buildRouterNameMap(moduleFiles);

  // ── Parse tRPC procedures ──

  const procedures: TrpcProcedure[] = [];

  for (const file of trpcFiles) {
    const rawProcedures = parseTrpcFile(file);
    const content = fs.readFileSync(file, 'utf-8');
    const routerPrefix = resolveRouterPrefix(file, routerNameMap, content);
    const relPath = path.relative(projectRoot, file);

    for (const proc of rawProcedures) {
      procedures.push({
        type: proc.type as TrpcProcedure['type'],
        route: `${routerPrefix}.${proc.name}`,
        auth: proc.auth,
        file: relPath,
      });
    }
  }

  // Deduplicate procedures by route name (e.g., saas/ and pro/ may contain identical files)
  const seenProcedures = new Set<string>();
  const uniqueProcedures: TrpcProcedure[] = [];
  for (const proc of procedures) {
    const key = `${proc.route}:${proc.type}:${proc.auth}`;
    if (!seenProcedures.has(key)) {
      seenProcedures.add(key);
      uniqueProcedures.push(proc);
    }
  }
  procedures.length = 0;
  procedures.push(...uniqueProcedures);

  // Sort by route name
  procedures.sort((a, b) => a.route.localeCompare(b.route));

  // ── Parse page routes ──

  let pages = parsePageRoutes(projectRoot, mono);

  // Deduplicate by path
  const seen = new Set<string>();
  pages = pages.filter((p) => {
    if (seen.has(p.path)) return false;
    seen.add(p.path);
    return true;
  });

  // Sort by path
  pages.sort((a, b) => a.path.localeCompare(b.path));

  // ── Apply filter ──

  let filteredProcedures = procedures;
  let filteredPages = pages;

  if (filter) {
    const lowerFilter = filter.toLowerCase();
    filteredProcedures = procedures.filter(
      (p) =>
        p.route.toLowerCase().includes(lowerFilter) ||
        p.file.toLowerCase().includes(lowerFilter) ||
        p.auth.toLowerCase().includes(lowerFilter) ||
        p.type.toLowerCase().includes(lowerFilter),
    );
    filteredPages = pages.filter(
      (p) =>
        p.path.toLowerCase().includes(lowerFilter) ||
        p.component.toLowerCase().includes(lowerFilter),
    );
  }

  // ── Output ──

  if (json) {
    const output: RoutesOutput = {
      trpc: filteredProcedures,
      pages: filteredPages,
    };
    console.log(JSON.stringify(output, null, 2));
  } else {
    printTable(filteredProcedures, filteredPages);
  }
}
