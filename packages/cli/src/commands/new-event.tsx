import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import { Header, Success, ErrorMsg, Info, type TaskStatus } from '../components/index';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, join } from 'path';
import { detectSrcDir } from './new-feature';

type NewEventProps = {
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

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
}

// ── Template ─────────────────────────────────────────────────────────────────

function eventTemplate(pascal: string): string {
  return `export class ${pascal}Event {
  constructor(
    public readonly data: { id: string; [key: string]: unknown },
  ) {}
}
`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const NewEvent: React.FC<NewEventProps> = ({ rootDir, name }) => {
  const { exit } = useApp();
  const [status, setStatus] = useState<TaskStatus>('running');
  const [error, setError] = useState<string | null>(null);
  const [createdFile, setCreatedFile] = useState<string | null>(null);

  const kebab = toKebabCase(name);
  const pascal = toPascalCase(name);
  const srcDir = detectSrcDir(rootDir);

  useEffect(() => {
    const run = () => {
      const eventsDir = resolve(rootDir, srcDir, 'events');
      const filePath = join(eventsDir, `${kebab}.event.ts`);

      if (existsSync(filePath)) {
        setError(`Event file already exists: ${srcDir}/events/${kebab}.event.ts`);
        setStatus('error');
        setTimeout(() => exit(), 100);
        return;
      }

      mkdirSync(eventsDir, { recursive: true });
      writeFileSync(filePath, eventTemplate(pascal), 'utf-8');

      setCreatedFile(`${srcDir}/events/${kebab}.event.ts`);
      setStatus('success');
      setTimeout(() => exit(), 100);
    };

    run();
  }, [rootDir, name, kebab, pascal, srcDir, exit]);

  return (
    <Box flexDirection="column">
      <Header title="New Event" subtitle={`${pascal}Event`} />

      {error ? (
        <ErrorMsg>{error}</ErrorMsg>
      ) : status === 'success' && createdFile ? (
        <Box flexDirection="column">
          <Success>Created {createdFile}</Success>
          <Box flexDirection="column" marginTop={1}>
            <Info>Usage:</Info>
            <Text color="gray">  import {'{'} {pascal}Event {'}'} from '../events/{kebab}.event';</Text>
            <Text> </Text>
            <Text color="gray">  // Emit the event from a service:</Text>
            <Text color="gray">  this.eventBus.emit(new {pascal}Event({'{'} id: item.id {'}'}))</Text>
          </Box>
        </Box>
      ) : (
        <Text>Scaffolding event...</Text>
      )}
    </Box>
  );
};

export default NewEvent;
