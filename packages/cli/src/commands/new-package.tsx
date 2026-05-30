import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import { Header, Success, ErrorMsg, Info, type TaskStatus } from '../components/index';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, join } from 'path';

type NewPackageProps = {
  rootDir: string;
  name: string;
};

// ── Name Helpers ──────────────────────────────────────────────────────────────

function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}

function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
}

// ── Templates ─────────────────────────────────────────────────────────────────

function generatePackageJson(name: string): string {
  const kebab = toKebabCase(name);
  return JSON.stringify(
    {
      name: `@cruzjs/${kebab}`,
      version: '0.1.0',
      description: `CruzJS ${toPascalCase(name)} package`,
      type: 'module',
      main: 'src/index.ts',
      exports: {
        '.': './src/index.ts',
        './*': './src/*',
      },
      files: ['dist/', 'src/', 'README.md'],
      peerDependencies: {
        '@cruzjs/core': '>=0.1.0',
        'inversify': '>=7.0.0',
        'reflect-metadata': '>=0.2.0',
      },
      devDependencies: {
        typescript: '^5.9.3',
      },
    },
    null,
    2,
  );
}

function generateTsconfig(): string {
  return JSON.stringify(
    {
      extends: '../../tsconfig.json',
      compilerOptions: {
        composite: true,
        declaration: true,
        declarationMap: true,
        outDir: './dist',
        rootDir: './src',
      },
      include: ['src'],
      exclude: ['dist', 'node_modules'],
    },
    null,
    2,
  );
}

function generateBarrel(name: string): string {
  const kebab = toKebabCase(name);
  const pascal = toPascalCase(name);
  return `export { ${pascal}Module } from './${kebab}.module';
export { ${pascal}Service } from './${kebab}.service';
`;
}

function generateModule(name: string): string {
  const kebab = toKebabCase(name);
  const pascal = toPascalCase(name);
  return `import { Module } from '@cruzjs/core';
import { ${pascal}Service } from './${kebab}.service';

@Module({
  providers: [${pascal}Service],
})
export class ${pascal}Module {}
`;
}

function generateService(name: string): string {
  const pascal = toPascalCase(name);
  return `import { Injectable } from '@cruzjs/core';

@Injectable()
export class ${pascal}Service {
  // TODO: implement ${pascal} service methods
}
`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const NewPackage: React.FC<NewPackageProps> = ({ rootDir, name }) => {
  const { exit } = useApp();
  const [status, setStatus] = useState<TaskStatus>('running');
  const [error, setError] = useState<string | null>(null);
  const [createdFiles, setCreatedFiles] = useState<string[]>([]);

  const kebab = toKebabCase(name);
  const pascal = toPascalCase(name);

  useEffect(() => {
    const run = () => {
      const targetDir = resolve(rootDir, 'packages', kebab);

      if (existsSync(targetDir)) {
        setError(`Directory already exists: packages/${kebab}`);
        setStatus('error');
        setTimeout(() => exit(), 100);
        return;
      }

      const files: Record<string, string> = {
        'package.json': generatePackageJson(name),
        'tsconfig.json': generateTsconfig(),
        'src/index.ts': generateBarrel(name),
        [`src/${kebab}.module.ts`]: generateModule(name),
        [`src/${kebab}.service.ts`]: generateService(name),
      };

      const written: string[] = [];
      for (const [relPath, content] of Object.entries(files)) {
        const fullPath = join(targetDir, relPath);
        const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
        mkdirSync(dir, { recursive: true });
        writeFileSync(fullPath, content, 'utf-8');
        written.push(`packages/${kebab}/${relPath}`);
      }

      setCreatedFiles(written);
      setStatus('success');
      setTimeout(() => exit(), 100);
    };

    run();
  }, [rootDir, name, kebab, exit]);

  return (
    <Box flexDirection="column">
      <Header title="New Package" subtitle={`@cruzjs/${kebab}`} />

      {error ? (
        <ErrorMsg>{error}</ErrorMsg>
      ) : status === 'success' ? (
        <Box flexDirection="column">
          <Success>Created packages/{kebab}/ (5 files)</Success>
          <Box flexDirection="column" marginTop={1} marginLeft={2}>
            {createdFiles.map((f) => (
              <Text key={f} color="gray">
                + {f}
              </Text>
            ))}
          </Box>
          <Box flexDirection="column" marginTop={1}>
            <Info>Next steps:</Info>
            <Text color="gray">  1. Add the package to the workspace (pnpm-workspace.yaml or root package.json)</Text>
            <Text color="gray">  2. Install dependencies:</Text>
            <Text color="gray">     pnpm install</Text>
            <Text> </Text>
            <Text color="gray">  3. Import the module in your app:</Text>
            <Text color="gray">     import {'{'} {pascal}Module {'}'} from '@cruzjs/{kebab}';</Text>
            <Text color="gray">     modules: [..., {pascal}Module]</Text>
          </Box>
        </Box>
      ) : (
        <Text>Scaffolding package...</Text>
      )}
    </Box>
  );
};

export default NewPackage;
