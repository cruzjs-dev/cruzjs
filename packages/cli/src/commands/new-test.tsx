import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import { Header, Success, ErrorMsg, Info, type TaskStatus } from '../components/index';
import { existsSync, mkdirSync, writeFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { detectFeaturesDir } from './new-feature';

type NewTestProps = {
  rootDir: string;
  name: string;
  kind: 'unit' | 'integration';
};

// ── Name Helpers ──────────────────────────────────────────────────────────────

function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
}

// ── Templates ─────────────────────────────────────────────────────────────────

function unitTestTemplate(pascal: string, kebab: string): string {
  return `import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ${pascal}Service } from './${kebab}.service';
import { DRIZZLE } from '@cruzjs/core/shared/database/drizzle.service';

describe('${pascal}Service', () => {
  let service: ${pascal}Service;
  let mockDb: ReturnType<typeof createMockDb>;

  function createMockDb() {
    return {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    };
  }

  beforeEach(() => {
    mockDb = createMockDb();
    service = new ${pascal}Service(mockDb as any);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // TODO: add tests for list, getById, create, update, delete
});
`;
}

function integrationTestTemplate(pascal: string, kebab: string): string {
  return `import { describe, it, expect, beforeEach } from 'vitest';
import { createTestContainer, createTestDb } from '@cruzjs/core/testing';
import { ${pascal}Module } from './${kebab}.module';
import { ${pascal}Service } from './${kebab}.service';
import * as schema from '../../database/schema';

describe('${pascal}Service (integration)', () => {
  let container: Awaited<ReturnType<typeof createTestContainer>>;

  beforeEach(async () => {
    const db = await createTestDb(schema);
    container = await createTestContainer([${pascal}Module], { db });
  });

  it('should be defined', () => {
    const service = container.resolve(${pascal}Service);
    expect(service).toBeDefined();
  });

  // TODO: add integration tests
  // it('creates and lists items', async () => {
  //   const svc = container.resolve(${pascal}Service);
  //   const scopeId = 'test-scope-id';
  //   await svc.create(scopeId, { name: 'Test Item' });
  //   const items = await svc.list(scopeId);
  //   expect(items).toHaveLength(1);
  //   expect(items[0].name).toBe('Test Item');
  // });
});
`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const NewTest: React.FC<NewTestProps> = ({ rootDir, name, kind }) => {
  const { exit } = useApp();
  const [status, setStatus] = useState<TaskStatus>('running');
  const [error, setError] = useState<string | null>(null);
  const [outputPath, setOutputPath] = useState<string>('');

  useEffect(() => {
    const run = () => {
      const pascal = toPascalCase(name);
      const kebab = toKebabCase(name);
      const suffix = kind === 'integration' ? '.integration' : '';
      const fileName = `${kebab}.service${suffix}.test.ts`;

      const featuresDir = detectFeaturesDir(rootDir);
      const featureDir = resolve(rootDir, featuresDir, kebab);

      if (!existsSync(featureDir)) {
        setError(`Feature directory not found: ${featuresDir}/${kebab}\n  Run: cruz new feature ${name}`);
        setStatus('error');
        setTimeout(() => exit(), 100);
        return;
      }

      const filePath = resolve(featureDir, fileName);
      if (existsSync(filePath)) {
        setError(`File already exists: ${featuresDir}/${kebab}/${fileName}`);
        setStatus('error');
        setTimeout(() => exit(), 100);
        return;
      }

      const content = kind === 'integration'
        ? integrationTestTemplate(pascal, kebab)
        : unitTestTemplate(pascal, kebab);

      writeFileSync(filePath, content, 'utf-8');

      setOutputPath(`${featuresDir}/${kebab}/${fileName}`);
      setStatus('success');
      setTimeout(() => exit(), 100);
    };

    run();
  }, [rootDir, name, kind, exit]);

  const pascal = toPascalCase(name);

  return (
    <Box flexDirection="column">
      <Header
        title={`New ${kind === 'integration' ? 'Integration ' : ''}Test`}
        subtitle={`${pascal}Service`}
      />

      {error ? (
        <ErrorMsg>{error}</ErrorMsg>
      ) : status === 'success' ? (
        <Box flexDirection="column">
          <Success>Created test file</Success>
          <Box flexDirection="column" marginTop={1} marginLeft={2}>
            <Text color="gray">+ {outputPath}</Text>
          </Box>
          <Box flexDirection="column" marginTop={1}>
            <Info>Run tests:</Info>
            <Text color="gray">  cruz test</Text>
            <Text color="gray">  cruz test --watch</Text>
          </Box>
        </Box>
      ) : (
        <Text color="gray">Scaffolding test file...</Text>
      )}
    </Box>
  );
};

export default NewTest;
