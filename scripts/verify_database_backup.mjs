import process from "node:process";
import { readAndVerifyBackup } from "./lib/database_backup.mjs";

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const inputDirectory = argumentValue("--input");
if (!inputDirectory) {
  console.error("Usage: npm run backup:verify -- --input <backup-directory>");
  process.exit(1);
}

const maxAgeValue = argumentValue("--max-age-hours");
const maxAgeHours = maxAgeValue === undefined ? undefined : Number(maxAgeValue);
if (maxAgeValue !== undefined && (!Number.isFinite(maxAgeHours) || maxAgeHours <= 0)) {
  console.error("--max-age-hours must be a positive number");
  process.exit(1);
}

try {
  const { manifest } = await readAndVerifyBackup(inputDirectory, {
    migrationDirectory: process.argv.includes("--check-migrations")
      ? "supabase/migrations"
      : undefined,
    maxAgeHours,
  });
  const counts = Object.fromEntries(
    Object.entries(manifest.tables).map(([table, entry]) => [table, entry.rows]),
  );
  console.log(
    `Database backup verified: ${manifest.snapshot_sha256}\n` +
      `Created: ${manifest.created_at}\n` +
      `Rows: ${JSON.stringify(counts)}`,
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Database backup verification failed: ${message}`);
  process.exitCode = 1;
}
