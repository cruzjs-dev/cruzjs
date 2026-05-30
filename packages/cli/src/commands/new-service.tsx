import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import { Header, Success, ErrorMsg, Info, type TaskStatus } from '../components/index';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, join } from 'path';
import { detectFeaturesDir, detectSrcDir } from './new-feature';

type NewServiceProps = {
  rootDir: string;
  name: string;
  feature?: string;
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

// ── Template ─────────────────────────────────────────────────────────────────

function serviceTemplate(pascal: string): string {
  return `import { Injectable, Inject } from '@cruzjs/core/di';
import { DRIZZLE, type DrizzleDatabase } from '@cruzjs/core/shared/database/drizzle.service';

@Injectable()
export class ${pascal}Service {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
  ) {}

  // TODO: implement ${pascal}Service methods
}
`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const NewService: React.FC<NewServiceProps> = ({ rootDir, name, feature }) => {
  const { exit } = useApp();
  const [status, setStatus] = useState<TaskStatus>('running');
  const [error, setError] = useState<string | null>(null);
  const [createdFile, setCreatedFile] = useState<string | null>(null);

  const kebab = toKebabCase(name);
  const pascal = toPascalCase(name);
  const featuresDir = detectFeaturesDir(rootDir);
  const srcDir = detectSrcDir(rootDir);

  useEffect(() => {
    const run = () => {
      let targetDir: string;
      let relDir: string;

      if (feature) {
        const featureKebab = toKebabCase(feature);
        targetDir = resolve(rootDir, featuresDir, featureKebab);
        relDir = `${featuresDir}/${featureKebab}`;

        if (!existsSync(targetDir)) {
          setError(`Feature directory does not exist: ${relDir}. Create it first with: cruz new feature ${featureKebab}`);
          setStatus('error');
          setTimeout(() => exit(), 100);
          return;
        }
      } else {
        targetDir = resolve(rootDir, srcDir, 'services');
        relDir = `${srcDir}/services`;
      }

      const filePath = join(targetDir, `${kebab}.service.ts`);
      const relPath = `${relDir}/${kebab}.service.ts`;

      if (existsSync(filePath)) {
        setError(`Service file already exists: ${relPath}`);
        setStatus('error');
        setTimeout(() => exit(), 100);
        return;
      }

      mkdirSync(targetDir, { recursive: true });
      writeFileSync(filePath, serviceTemplate(pascal), 'utf-8');

      setCreatedFile(relPath);
      setStatus('success');
      setTimeout(() => exit(), 100);
    };

    run();
  }, [rootDir, name, feature, kebab, pascal, featuresDir, srcDir, exit]);

  return (
    <Box flexDirection="column">
      <Header title="New Service" subtitle={`${pascal}Service${feature ? ` (in ${feature})` : ''}`} />

      {error ? (
        <ErrorMsg>{error}</ErrorMsg>
      ) : status === 'success' && createdFile ? (
        <Box flexDirection="column">
          <Success>Created {createdFile}</Success>
          <Box flexDirection="column" marginTop={1}>
            <Info>Next steps:</Info>
            <Text color="gray">  1. Register the service as a provider in your module:</Text>
            <Text color="gray">     providers: [..., {pascal}Service]</Text>
          </Box>
        </Box>
      ) : (
        <Text>Scaffolding service...</Text>
      )}
    </Box>
  );
};

export default NewService;
