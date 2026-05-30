import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import { Header, Success, ErrorMsg, Info, type TaskStatus } from '../components/index';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { detectFeaturesDir, detectSrcDir } from './new-feature';

type NewJobProps = {
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

// ── Template ──────────────────────────────────────────────────────────────────

function jobHandlerTemplate(pascal: string, kebab: string): string {
  // Strip "Job" suffix if user provided it, we'll add it back consistently
  const cleanPascal = pascal.replace(/Job(Handler)?$/i, '');
  const cleanKebab = kebab.replace(/-?job(-handler)?$/i, '');
  const handlerClass = `${cleanPascal}JobHandler`;
  const jobType = `${cleanKebab}-job`;

  return `import type { Job } from '@cruzjs/core/database/schema';
import type { JobHandler, JobHandlerMetadata, JobResult } from '@cruzjs/core/jobs/job.types';
import { injectable, inject } from 'inversify';
import { DRIZZLE, type DrizzleDatabase } from '@cruzjs/core/shared/database/drizzle.service';

type ${cleanPascal}JobPayload = {
  // Define your job payload fields here
};

@injectable()
export class ${handlerClass} implements JobHandler {
  readonly metadata: JobHandlerMetadata = {
    jobType: '${jobType}',
    statuses: ['PENDING'],
    description: '${cleanPascal} background job',
  };

  constructor(
    @inject(DRIZZLE) private readonly db: DrizzleDatabase,
  ) {}

  async run(job: Job): Promise<JobResult> {
    const payload = job.payload as unknown as ${cleanPascal}JobPayload;

    try {
      // TODO: implement job logic here
      console.log(\`[${handlerClass}] Processing job \${job.id}\`, payload);

      return {
        success: true,
        summary: { processedAt: new Date().toISOString() },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const NewJob: React.FC<NewJobProps> = ({ rootDir, name, feature }) => {
  const { exit } = useApp();
  const [status, setStatus] = useState<TaskStatus>('running');
  const [error, setError] = useState<string | null>(null);
  const [outputPath, setOutputPath] = useState<string>('');
  const [handlerClass, setHandlerClass] = useState<string>('');

  useEffect(() => {
    const run = () => {
      const pascal = toPascalCase(name);
      const kebab = toKebabCase(name);

      // Strip "Job" suffix to avoid duplication
      const cleanPascal = pascal.replace(/Job(Handler)?$/i, '');
      const cleanKebab = kebab.replace(/-?job(-handler)?$/i, '');
      const handler = `${cleanPascal}JobHandler`;

      let outputDir: string;
      let relPath: string;

      if (feature) {
        const featuresDir = detectFeaturesDir(rootDir);
        const featureKebab = toKebabCase(feature);
        outputDir = resolve(rootDir, featuresDir, featureKebab);
        relPath = `${featuresDir}/${featureKebab}/${cleanKebab}.job.ts`;
      } else {
        const srcDir = detectSrcDir(rootDir);
        outputDir = resolve(rootDir, srcDir, 'jobs');
        relPath = `${srcDir.split('/').pop()}/jobs/${cleanKebab}.job.ts`;
      }

      const filePath = resolve(outputDir, `${cleanKebab}.job.ts`);

      if (existsSync(filePath)) {
        setError(`File already exists: ${relPath}`);
        setStatus('error');
        setTimeout(() => exit(), 100);
        return;
      }

      mkdirSync(outputDir, { recursive: true });
      writeFileSync(filePath, jobHandlerTemplate(pascal, kebab), 'utf-8');

      setOutputPath(relPath);
      setHandlerClass(handler);
      setStatus('success');
      setTimeout(() => exit(), 100);
    };

    run();
  }, [rootDir, name, feature, exit]);

  const cleanPascal = toPascalCase(name).replace(/Job(Handler)?$/i, '');
  const cleanKebab = toKebabCase(name).replace(/-?job(-handler)?$/i, '');

  return (
    <Box flexDirection="column">
      <Header
        title="New Job Handler"
        subtitle={feature ? `${cleanPascal}JobHandler (in ${feature})` : `${cleanPascal}JobHandler`}
      />

      {error ? (
        <ErrorMsg>{error}</ErrorMsg>
      ) : status === 'success' ? (
        <Box flexDirection="column">
          <Success>Created {handlerClass}</Success>
          <Box flexDirection="column" marginTop={1} marginLeft={2}>
            <Text color="gray">+ {outputPath}</Text>
          </Box>
          <Box flexDirection="column" marginTop={1}>
            <Info>Next steps:</Info>
            <Text color="gray">  1. Register in your module's providers:</Text>
            <Text color="gray">     providers: [..., {handlerClass}]</Text>
            <Text color="gray"> </Text>
            <Info>  2. Dispatch the job from a service:</Info>
            <Text color="gray">     await this.jobService.enqueue('{`${cleanKebab}-job`}', payload);</Text>
          </Box>
        </Box>
      ) : (
        <Text color="gray">Scaffolding job handler...</Text>
      )}
    </Box>
  );
};

export default NewJob;
