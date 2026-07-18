import path from "node:path";
import process from "node:process";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import {
  fetchStableSnapshot,
  migrationChecksums,
  projectRefFromUrl,
  readAndVerifyBackup,
  writeBackup,
} from "./lib/database_backup.mjs";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function defaultOutputDirectory() {
  const timestamp = new Date().toISOString().replaceAll(":", "-");
  return path.join("backups", timestamp);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !serviceKey) {
  throw new Error("Backup requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
}
if (anonKey && serviceKey === anonKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY must not be the public anon key");
}

const outputDirectory = argumentValue("--output") ?? defaultOutputDirectory();
const gitSha = argumentValue("--git-sha") ?? process.env.GITHUB_SHA ?? null;
const force = process.argv.includes("--force");
const projectRef = projectRefFromUrl(url);
const client = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

try {
  const tables = await fetchStableSnapshot(client);
  const migrations = await migrationChecksums();
  const { output, manifest } = await writeBackup({
    outputDirectory,
    tables,
    projectRef,
    gitSha,
    migrations,
    force,
  });
  await readAndVerifyBackup(output, {
    migrationDirectory: "supabase/migrations",
    maxAgeHours: 1,
  });

  const counts = Object.fromEntries(
    Object.entries(manifest.tables).map(([table, entry]) => [table, entry.rows]),
  );
  console.log(
    `Database backup created and verified: ${output}\n` +
      `Project: ${projectRef}\n` +
      `Snapshot: ${manifest.snapshot_sha256}\n` +
      `Rows: ${JSON.stringify(counts)}`,
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Database backup failed: ${message}`);
  process.exitCode = 1;
}
