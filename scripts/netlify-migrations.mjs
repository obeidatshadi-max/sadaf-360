// Mirrors Drizzle migrations (drizzle/NNNN_name.sql) into the layout Netlify Database applies on deploy:
// netlify/database/migrations/NNNN_name-with-hyphens/migration.sql. Run after `npm run db:generate`.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export function netlifyMigrationDir(file) {
  const [, num, name] = file.match(/^(\d+)_(.+)\.sql$/);
  return `${num}_${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const file of readdirSync("drizzle").filter((f) => f.endsWith(".sql")).sort()) {
    const dir = join("netlify/database/migrations", netlifyMigrationDir(file));
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "migration.sql"), readFileSync(join("drizzle", file)));
    console.log(`✓ ${dir}/migration.sql`);
  }
}
