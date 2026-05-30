import React from 'react';
import { Box, Text } from 'ink';
import { Header } from './components/index';
import { Config } from './config/index';

// Deploy & Infrastructure Commands
import { Setup } from './commands/setup';
import { Init } from './commands/init';
import { Deploy } from './commands/deploy';
import { Status } from './commands/status';
import { Destroy } from './commands/destroy';
import { Database } from './commands/database';
import { Storage } from './commands/storage';
import { KV } from './commands/kv';
import { Secrets } from './commands/secrets';
import { Domain } from './commands/domain';
import { Workflows } from './commands/workflows';
import { New, type NewKind } from './commands/new';
import { NewFeature, type FeatureScope, parseFields } from './commands/new-feature';
import { NewModel } from './commands/new-model';
import { NewPackage } from './commands/new-package';
import { NewEvent } from './commands/new-event';
import { NewService } from './commands/new-service';
import { NewJob } from './commands/new-job';
import { NewTest } from './commands/new-test';
import { NewCrud } from './commands/new-crud';
import { Queues } from './commands/queues';

// Local Development Commands
import { Build } from './commands/build';
import { Start } from './commands/start';
import { Test } from './commands/test';
import { TestE2E } from './commands/teste2e';
import { Typecheck } from './commands/typecheck';
import { Worker } from './commands/worker';
import { LocalDatabase } from './commands/local-database';
import { DevStart, DevStop, DevRestart, DevStatus } from './commands/dev-server';

export type Command =
  | { type: 'help' }
  // Deploy & Infrastructure
  | { type: 'setup' }
  | { type: 'init'; env?: string; accountId?: string; yes?: boolean }
  | { type: 'deploy'; env?: string; skipBuild?: boolean; skipMigrate?: boolean; yes?: boolean; healthCheck?: boolean }
  | { type: 'status'; env?: string }
  | { type: 'destroy'; env?: string; yes?: boolean; force?: boolean }
  | { type: 'database'; subAction: 'create' | 'list' | 'migrate' | 'info'; env?: string; name?: string; remote?: boolean }
  | { type: 'storage'; subAction: 'create' | 'list'; name?: string }
  | { type: 'kv'; subAction: 'create' | 'list'; name?: string }
  | { type: 'secrets'; subAction: 'set' | 'list'; env?: string; name?: string; value?: string }
  | { type: 'domain'; subAction: 'add' | 'list'; env?: string; domain?: string }
  | { type: 'workflows'; subAction: 'list' | 'trigger' | 'instances'; name?: string; params?: string }
  | { type: 'new'; kind: NewKind; name: string; queue?: string }
  | { type: 'new-feature'; name: string; scope: FeatureScope; crud: boolean; wire: boolean; fields?: string[] }
  | { type: 'new-model'; name: string; scope: FeatureScope; wire: boolean; fields?: string[] }
  | { type: 'new-package'; name: string }
  | { type: 'new-event'; name: string }
  | { type: 'new-service'; name: string; feature?: string }
  | { type: 'new-job'; name: string; feature?: string }
  | { type: 'new-test'; name: string; kind: 'unit' | 'integration' }
  | { type: 'new-crud'; name: string; scope: FeatureScope; wire: boolean }
  | { type: 'queues'; subAction: 'create' | 'list' | 'delete'; name?: string }
  // Local Development
  | { type: 'dev'; subAction: 'start' | 'stop' | 'restart' | 'status'; foreground?: boolean }
  | { type: 'build' }
  | { type: 'start' }
  | { type: 'test'; ui?: boolean; watch?: boolean; coverage?: boolean; integration?: boolean }
  | { type: 'teste2e'; ui?: boolean; watch?: boolean; headed?: boolean }
  | { type: 'typecheck'; tests?: boolean }
  | { type: 'worker'; subAction: 'dev' | 'start' }
  | { type: 'db'; subAction: 'generate' | 'migrate' | 'push' | 'studio' | 'seed' | 'hard-reset' | 'query' | 'rollback' | 'generate:migration' | 'generate:rollback' | 'backup' | 'restore'; env?: string; remote?: boolean; sql?: string; fresh?: boolean; steps?: number; name?: string; output?: string; file?: string }
  | { type: 'console'; env?: string }
  | { type: 'routes'; json?: boolean; filter?: string };

type AppProps = {
  command: Command;
  config: Config;
  saveConfig: (config: Config) => void;
  rootDir: string;
};

export const App: React.FC<AppProps> = ({ command, config, saveConfig, rootDir }) => {
  switch (command.type) {
    // Deploy & Infrastructure
    case 'setup':
      return <Setup config={config} saveConfig={saveConfig} rootDir={rootDir} />;
    case 'init':
      return <Init config={config} saveConfig={saveConfig} rootDir={rootDir} envName={command.env} accountId={command.accountId} autoConfirm={command.yes} />;
    case 'deploy':
      return <Deploy config={config} saveConfig={saveConfig} rootDir={rootDir} envName={command.env} skipBuild={command.skipBuild} skipMigrate={command.skipMigrate} autoConfirm={command.yes} healthCheck={command.healthCheck} />;
    case 'status':
      return <Status config={config} rootDir={rootDir} envName={command.env} />;
    case 'destroy':
      return <Destroy config={config} saveConfig={saveConfig} rootDir={rootDir} envName={command.env} autoConfirm={command.yes} force={command.force} />;
    case 'database':
      return <Database config={config} rootDir={rootDir} action={command.subAction} envName={command.env} name={command.name} remote={command.remote} />;
    case 'storage':
      return <Storage config={config} rootDir={rootDir} action={command.subAction} name={command.name} />;
    case 'kv':
      return <KV config={config} rootDir={rootDir} action={command.subAction} name={command.name} />;
    case 'secrets':
      return <Secrets config={config} rootDir={rootDir} action={command.subAction} envName={command.env} name={command.name} value={command.value} />;
    case 'domain':
      return <Domain config={config} saveConfig={saveConfig} rootDir={rootDir} action={command.subAction} envName={command.env} domain={command.domain} />;
    case 'workflows':
      return <Workflows config={config} rootDir={rootDir} action={command.subAction} name={command.name} params={command.params} />;
    case 'new':
      return <New rootDir={rootDir} kind={command.kind} name={command.name} queue={command.queue} />;
    case 'new-feature': {
      const parsedFields = command.fields && command.fields.length > 0 ? parseFields(command.fields) : undefined;
      return <NewFeature rootDir={rootDir} name={command.name} scope={command.scope} crud={command.crud} wire={command.wire} fields={parsedFields} />;
    }
    case 'new-model': {
      const modelFields = command.fields && command.fields.length > 0 ? parseFields(command.fields) : undefined;
      return <NewModel rootDir={rootDir} name={command.name} scope={command.scope} wire={command.wire} fields={modelFields} />;
    }
    case 'new-package':
      return <NewPackage rootDir={rootDir} name={command.name} />;
    case 'new-event':
      return <NewEvent rootDir={rootDir} name={command.name} />;
    case 'new-service':
      return <NewService rootDir={rootDir} name={command.name} feature={command.feature} />;
    case 'new-job':
      return <NewJob rootDir={rootDir} name={command.name} feature={command.feature} />;
    case 'new-test':
      return <NewTest rootDir={rootDir} name={command.name} kind={command.kind} />;
    case 'new-crud':
      return <NewCrud rootDir={rootDir} name={command.name} scope={command.scope} wire={command.wire} />;
    case 'queues':
      return <Queues config={config} rootDir={rootDir} action={command.subAction} name={command.name} />;

    // Local Development
    case 'dev':
      switch (command.subAction) {
        case 'start': return <DevStart rootDir={rootDir} />;
        case 'stop': return <DevStop rootDir={rootDir} />;
        case 'restart': return <DevRestart rootDir={rootDir} />;
        case 'status': return <DevStatus rootDir={rootDir} />;
      }
      break;
    case 'build':
      return <Build rootDir={rootDir} />;
    case 'start':
      return <Start rootDir={rootDir} />;
    case 'test':
      return <Test rootDir={rootDir} ui={command.ui} watch={command.watch} coverage={command.coverage} integration={command.integration} />;
    case 'teste2e':
      return <TestE2E rootDir={rootDir} ui={command.ui} watch={command.watch} headed={command.headed} />;
    case 'typecheck':
      return <Typecheck rootDir={rootDir} tests={command.tests} />;
    case 'worker':
      return <Worker rootDir={rootDir} action={command.subAction} />;
    case 'db':
      return <LocalDatabase rootDir={rootDir} action={command.subAction} env={command.env} remote={command.remote} sql={command.sql} fresh={command.fresh} steps={command.steps} name={command.name} output={command.output} file={command.file} />;

    case 'console':
      // Handled before Ink in index.tsx — this is a fallback
      return null;

    case 'routes':
      // Handled before Ink in index.tsx — this is a fallback
      return null;

    case 'help':
    default:
      return <HelpScreen />;
  }

  return null;
};

const HelpScreen: React.FC = () => {
  return (
    <Box flexDirection="column">
      <Header title="Cruz CLI" subtitle="CruzJS Development & Deployment" />

      <Box flexDirection="column" marginY={1}>
        <Text color="cyan" bold>USAGE</Text>
        <Box marginLeft={2}>
          <Text>cruz &lt;command&gt; [options]</Text>
        </Box>
      </Box>

      <Box flexDirection="column" marginY={1}>
        <Text color="cyan" bold>DEVELOPMENT</Text>
        <Box marginLeft={2} flexDirection="column">
          <Text>  <Text color="green">dev</Text>                         Start dev server (background)</Text>
          <Text>  <Text color="green">dev --foreground</Text>            Start dev server (foreground, live logs)</Text>
          <Text>  <Text color="green">dev stop</Text>                    Stop dev server</Text>
          <Text>  <Text color="green">dev restart</Text>                 Restart dev server</Text>
          <Text>  <Text color="green">dev status</Text>                  Check dev server status</Text>
          <Text>  <Text color="green">build</Text>                       Production build</Text>
          <Text>  <Text color="green">start</Text>                       Start production server</Text>
          <Text>  <Text color="green">test</Text>                        Run unit tests (vitest)</Text>
          <Text>  <Text color="green">test:e2e</Text>                    Run E2E tests (playwright)</Text>
          <Text>  <Text color="green">typecheck</Text>                   Type check (tsc --noEmit)</Text>
          <Text>  <Text color="green">worker dev/start</Text>            Run worker process</Text>
          <Text>  <Text color="green">console</Text>                     Interactive REPL with DI + database</Text>
          <Text>  <Text color="green">routes</Text>                      List all tRPC procedures and page routes</Text>
        </Box>
      </Box>

      <Box flexDirection="column" marginY={1}>
        <Text color="cyan" bold>DATABASE</Text>
        <Box marginLeft={2} flexDirection="column">
          <Text>  <Text color="green">db generate</Text>                 Generate drizzle migrations</Text>
          <Text>  <Text color="green">db migrate</Text>                  Apply migrations (local)</Text>
          <Text>  <Text color="green">db migrate --remote</Text>         Apply migrations (remote D1)</Text>
          <Text>  <Text color="green">db studio</Text>                   Open Drizzle Studio</Text>
          <Text>  <Text color="green">db seed</Text>                     Seed database</Text>
          <Text>  <Text color="green">db query</Text> &quot;SQL&quot;              Execute SQL against D1</Text>
          <Text>  <Text color="green">db hard-reset</Text>               Delete local D1 and re-migrate</Text>
        </Box>
      </Box>

      <Box flexDirection="column" marginY={1}>
        <Text color="cyan" bold>DEPLOY</Text>
        <Box marginLeft={2} flexDirection="column">
          <Text>  <Text color="green">deploy</Text> &lt;env&gt;                Deploy (build + migrate + ship)</Text>
          <Text>  <Text color="green">deploy preview</Text>              Preview deploy from current branch</Text>
          <Text>  <Text color="green">production</Text>                  Shortcut for deploy production</Text>
          <Text>  <Text color="green">staging</Text>                     Shortcut for deploy staging</Text>
        </Box>
      </Box>

      <Box flexDirection="column" marginY={1}>
        <Text color="cyan" bold>SCAFFOLD</Text>
        <Box marginLeft={2} flexDirection="column">
          <Text>  <Text color="green">new worker</Text> &lt;name&gt;           Create standalone Worker</Text>
          <Text>  <Text color="green">new workflow</Text> &lt;name&gt;         Create Workflow (durable steps)</Text>
          <Text>  <Text color="green">new queue-worker</Text> &lt;name&gt;    Create queue consumer Worker</Text>
          <Text>  <Text color="green">new feature</Text> &lt;name&gt; [fields] Create feature module (--scope --crud --wire)</Text>
          <Text>  <Text color="green">new package</Text> &lt;name&gt;        Create @cruzjs package in packages/</Text>
          <Text>  <Text color="green">new event</Text> &lt;name&gt;          Create event class in events/</Text>
          <Text>  <Text color="green">new service</Text> &lt;name&gt;        Create service (--feature &lt;name&gt;)</Text>
          <Text>  <Text color="green">new job</Text> &lt;name&gt;            Create job handler (--feature &lt;name&gt;)</Text>
          <Text>  <Text color="green">new test</Text> &lt;feature&gt;        Create test file (--integration)</Text>
          <Text>  <Text color="green">new crud</Text> &lt;name&gt;           Create createCrud module (--scope org|user|global --wire)</Text>
          <Text>  <Text color="green">new model</Text> &lt;name&gt; [fields] Generate schema only (e.g., title:string body:text)</Text>
          <Text>  <Text color="green">new migration</Text>              Generate Drizzle migration (alias for db generate)</Text>
        </Box>
      </Box>

      <Box flexDirection="column" marginY={1}>
        <Text color="cyan" bold>INFRASTRUCTURE</Text>
        <Box marginLeft={2} flexDirection="column">
          <Text>  <Text color="green">setup</Text>                       Interactive setup wizard</Text>
          <Text>  <Text color="green">init</Text> &lt;env&gt;                  Initialize environment</Text>
          <Text>  <Text color="green">status</Text>                      Show all environments</Text>
          <Text>  <Text color="green">destroy</Text> &lt;env&gt;               Tear down environment</Text>
          <Text>  <Text color="green">secrets set/list</Text>            Secret management</Text>
          <Text>  <Text color="green">queue create/list/delete</Text>    Queue management</Text>
          <Text>  <Text color="green">kv create/list</Text>              KV namespace operations</Text>
          <Text>  <Text color="green">r2 create/list</Text>              R2 bucket operations</Text>
          <Text>  <Text color="green">domain add/list</Text>             Custom domain management</Text>
        </Box>
      </Box>

      <Box flexDirection="column" marginY={1}>
        <Text color="cyan" bold>OPTIONS</Text>
        <Box marginLeft={2} flexDirection="column">
          <Text>  <Text color="yellow">-e, --env</Text> &lt;name&gt;           Environment name</Text>
          <Text>  <Text color="yellow">--skip-build</Text>                Skip build during deploy</Text>
          <Text>  <Text color="yellow">--skip-migrate</Text>              Skip migrations during deploy</Text>
          <Text>  <Text color="yellow">--remote</Text>                    Target remote D1</Text>
          <Text>  <Text color="yellow">--force</Text>                     Allow destroying production</Text>
          <Text>  <Text color="yellow">-y, --yes</Text>                   Auto-confirm prompts</Text>
          <Text>  <Text color="yellow">--ui</Text>                        UI mode for tests</Text>
          <Text>  <Text color="yellow">--watch</Text>                     Watch mode for tests</Text>
          <Text>  <Text color="yellow">--coverage</Text>                  Coverage mode for tests</Text>
        </Box>
      </Box>
    </Box>
  );
};

export default App;
