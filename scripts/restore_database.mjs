import process from "node:process";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import {
  TABLE_NAMES,
  TABLE_SPECS,
  assertRemoteSchema,
  fetchSnapshot,
  projectRefFromUrl,
  readAndVerifyBackup,
  snapshotFingerprint,
} from "./lib/database_backup.mjs";

const { loadEnvConfig } = nextEnv;
const BATCH_SIZE = 500;

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function batches(values) {
  const result = [];
  for (let index = 0; index < values.length; index += BATCH_SIZE) {
    result.push(values.slice(index, index + BATCH_SIZE));
  }
  return result;
}

function primaryKey(table, row) {
  return TABLE_SPECS[table].primaryKey.map((column) => String(row[column])).join("\u0000");
}

function extraRowCounts(remote, backup) {
  return Object.fromEntries(
    TABLE_NAMES.map((table) => {
      const expectedKeys = new Set(backup[table].map((row) => primaryKey(table, row)));
      const extras = remote[table].filter((row) => !expectedKeys.has(primaryKey(table, row)));
      return [table, extras.length];
    }),
  );
}

async function deleteIds(client, table, ids) {
  for (const batch of batches(ids)) {
    const { error } = await client.from(table).delete().in("id", batch);
    if (error) throw new Error(`prune ${table}: ${error.message}`);
  }
}

async function pruneTarget(client, remote, backup) {
  const expectedRelations = new Set(
    backup.poem_places.map((row) => primaryKey("poem_places", row)),
  );
  for (const relation of remote.poem_places) {
    if (expectedRelations.has(primaryKey("poem_places", relation))) continue;
    const { error } = await client
      .from("poem_places")
      .delete()
      .eq("poem_id", relation.poem_id)
      .eq("place_id", relation.place_id);
    if (error) throw new Error(`prune poem_places: ${error.message}`);
  }

  for (const table of ["authors", "poems", "places", "dynasties"]) {
    const expectedIds = new Set(backup[table].map((row) => row.id));
    const staleIds = remote[table]
      .map((row) => row.id)
      .filter((id) => !expectedIds.has(id));
    await deleteIds(client, table, staleIds);
  }
}

async function restoreTables(client, tables) {
  for (const table of ["dynasties", "places", "poems", "authors", "poem_places"]) {
    for (const batch of batches(tables[table])) {
      const { error } = await client.from(table).upsert(batch, {
        onConflict: TABLE_SPECS[table].primaryKey.join(","),
      });
      if (error) throw new Error(`restore ${table}: ${error.message}`);
    }
  }
}

const inputDirectory = argumentValue("--input");
if (!inputDirectory) {
  console.error(
    "Usage: npm run restore:database -- --input <backup-directory> [--apply --confirm-project-ref <ref>] [--prune]",
  );
  process.exit(1);
}

const apply = process.argv.includes("--apply");
const prune = process.argv.includes("--prune");
const allowMigrationDrift = process.argv.includes("--allow-migration-drift");

try {
  const { manifest, tables } = await readAndVerifyBackup(inputDirectory, {
    migrationDirectory: allowMigrationDrift ? undefined : "supabase/migrations",
  });
  const counts = Object.fromEntries(
    Object.entries(manifest.tables).map(([table, entry]) => [table, entry.rows]),
  );

  if (!apply) {
    console.log(
      `Restore dry run passed. No database writes were made.\n` +
        `Source project: ${manifest.source.project_ref}\n` +
        `Created: ${manifest.created_at}\n` +
        `Snapshot: ${manifest.snapshot_sha256}\n` +
        `Rows: ${JSON.stringify(counts)}\n` +
        `Apply only after migrations: npm run restore:database -- --input ${inputDirectory} --apply --confirm-project-ref <target-ref>`,
    );
    process.exit(0);
  }

  loadEnvConfig(process.cwd());
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !serviceKey) {
    throw new Error("Restore requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }
  if (anonKey && serviceKey === anonKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY must not be the public anon key");
  }

  const targetRef = projectRefFromUrl(url);
  const confirmedRef = argumentValue("--confirm-project-ref");
  if (confirmedRef !== targetRef) {
    throw new Error(`Refusing restore: --confirm-project-ref must equal ${targetRef}`);
  }
  if (
    targetRef === manifest.source.project_ref &&
    !process.argv.includes("--allow-in-place")
  ) {
    throw new Error(
      "Refusing in-place restore without --allow-in-place; prefer restoring into a new Supabase project",
    );
  }

  await assertRemoteSchema(url, serviceKey);
  const client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const remoteBefore = await fetchSnapshot(client);
  const extras = extraRowCounts(remoteBefore, tables);
  const totalExtras = Object.values(extras).reduce((sum, value) => sum + value, 0);
  if (totalExtras > 0 && !prune) {
    throw new Error(
      `Target contains rows outside the backup (${JSON.stringify(extras)}); rerun with --prune for exact recovery`,
    );
  }
  if (prune) await pruneTarget(client, remoteBefore, tables);

  await restoreTables(client, tables);
  const remoteAfter = await fetchSnapshot(client);
  if (snapshotFingerprint(remoteAfter) !== manifest.snapshot_sha256) {
    throw new Error("Restore finished but target fingerprint differs from the backup");
  }

  console.log(
    `Database restore completed and verified.\n` +
      `Target project: ${targetRef}\n` +
      `Snapshot: ${manifest.snapshot_sha256}\n` +
      `Rows: ${JSON.stringify(counts)}`,
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Database restore failed: ${message}`);
  process.exitCode = 1;
}
