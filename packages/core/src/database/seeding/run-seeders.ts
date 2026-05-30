/**
 * Seeder Runner
 *
 * Discovers seeder files in a directory, instantiates them, and runs them
 * in filename order. Each file must default-export a class implementing `Seeder`.
 *
 * @example
 * ```ts
 * import { runSeeders } from '@cruzjs/core/database/seeding/run-seeders';
 * await runSeeders(db, 'apps/web/src/database/seeders');
 * ```
 */

import { readdirSync } from 'fs';
import { resolve, extname, basename } from 'path';
import type { CruzDatabase } from '../../shared/database/cruz-database';
import type { SeederClass } from './seeder';

/**
 * Discover and run all seeders from the given directory.
 *
 * Files are sorted by name (use numeric prefixes like `001-users.ts`
 * to control execution order). Each file must default-export a class
 * implementing the `Seeder` interface.
 *
 * @param db        - The CruzDatabase instance to pass to each seeder.
 * @param directory - Absolute path to the seeders directory.
 */
export async function runSeeders(
  db: CruzDatabase,
  directory: string,
): Promise<void> {
  const files = readdirSync(directory)
    .filter((f) => {
      const ext = extname(f);
      return (ext === '.ts' || ext === '.js') && !f.endsWith('.d.ts');
    })
    .sort();

  if (files.length === 0) {
    console.log('[Seeder] No seeder files found.');
    return;
  }

  console.log(`[Seeder] Found ${files.length} seeder(s).`);

  for (const file of files) {
    const filePath = resolve(directory, file);
    const name = basename(file, extname(file));

    console.log(`[Seeder] Running: ${name}`);

    try {
      const mod = await import(filePath);
      const SeederCls: SeederClass = mod.default ?? mod[Object.keys(mod)[0]];

      if (!SeederCls || typeof SeederCls !== 'function') {
        console.error(`[Seeder] ${file} does not export a valid seeder class. Skipping.`);
        continue;
      }

      const seeder = new SeederCls();
      await seeder.run(db);

      console.log(`[Seeder] Completed: ${name}`);
    } catch (error) {
      console.error(`[Seeder] Failed: ${name}`, error);
      throw error;
    }
  }

  console.log('[Seeder] All seeders completed.');
}
