import { createHash } from "node:crypto";
import { readFile, readdir, mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export const BACKUP_FORMAT = "poetry-atlas-supabase-backup";
export const BACKUP_VERSION = 1;

export const TABLE_SPECS = {
  dynasties: {
    columns: ["id", "name", "name_en", "start_year", "end_year", "sort_order"],
    primaryKey: ["id"],
    order: ["sort_order", "id"],
  },
  places: {
    columns: ["id", "name", "type", "lng", "lat", "ancient_names", "created_at"],
    primaryKey: ["id"],
    order: ["id"],
  },
  poems: {
    columns: [
      "id",
      "title",
      "author",
      "dynasty",
      "dynasty_id",
      "content",
      "created_at",
    ],
    primaryKey: ["id"],
    order: ["id"],
  },
  poem_places: {
    columns: ["poem_id", "place_id", "relation_type"],
    primaryKey: ["poem_id", "place_id"],
    order: ["poem_id", "place_id"],
  },
  authors: {
    columns: [
      "id",
      "name",
      "dynasty",
      "birth_year",
      "death_year",
      "courtesy_name",
      "art_name",
      "biography",
      "avatar_url",
      "poem_count",
      "place_count",
      "created_at",
    ],
    primaryKey: ["id"],
    order: ["name", "id"],
  },
};

export const TABLE_NAMES = Object.keys(TABLE_SPECS);
const PAGE_SIZE = 1000;

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function jsonBytes(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function projectRefFromUrl(url) {
  const hostname = new URL(url).hostname;
  const projectRef = hostname.split(".")[0];
  if (!projectRef || hostname !== `${projectRef}.supabase.co`) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not a hosted Supabase project URL");
  }
  return projectRef;
}

function compareValues(left, right) {
  if (left === right) return 0;
  if (left === null || left === undefined) return -1;
  if (right === null || right === undefined) return 1;
  if (typeof left === "number" && typeof right === "number") return left - right;
  return String(left).localeCompare(String(right), "en");
}

export function sortTableRows(table, rows) {
  const spec = TABLE_SPECS[table];
  return [...rows].sort((left, right) => {
    for (const column of spec.order) {
      const comparison = compareValues(left[column], right[column]);
      if (comparison !== 0) return comparison;
    }
    return 0;
  });
}

export async function fetchTable(client, table) {
  const spec = TABLE_SPECS[table];
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = client
      .from(table)
      .select(spec.columns.join(","))
      .range(from, from + PAGE_SIZE - 1);
    for (const column of spec.order) query = query.order(column);
    const { data, error } = await query;
    if (error) throw new Error(`backup ${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return sortTableRows(table, rows);
}

export async function fetchSnapshot(client) {
  const entries = await Promise.all(
    TABLE_NAMES.map(async (table) => [table, await fetchTable(client, table)]),
  );
  return Object.fromEntries(entries);
}

export function snapshotFingerprint(tables) {
  const tableHashes = Object.fromEntries(
    TABLE_NAMES.map((table) => [table, sha256(jsonBytes(sortTableRows(table, tables[table])))]),
  );
  return sha256(jsonBytes(tableHashes));
}

export async function fetchStableSnapshot(client, attempts = 3) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const first = await fetchSnapshot(client);
    await new Promise((resolve) => setTimeout(resolve, 100));
    const second = await fetchSnapshot(client);
    if (snapshotFingerprint(first) === snapshotFingerprint(second)) return second;
    if (attempt === attempts) {
      throw new Error(
        `Database changed during ${attempts} consecutive backup attempts; retry when writes are quiet`,
      );
    }
  }
  throw new Error("Unable to obtain a stable database snapshot");
}

export async function migrationChecksums(directory = "supabase/migrations") {
  const filenames = (await readdir(directory))
    .filter((filename) => filename.endsWith(".sql"))
    .sort();
  if (filenames.length === 0) {
    throw new Error(`No SQL migrations found in ${directory}`);
  }
  return Promise.all(
    filenames.map(async (filename) => {
      const bytes = await readFile(path.join(directory, filename));
      return { filename, sha256: sha256(bytes) };
    }),
  );
}

async function directoryHasEntries(directory) {
  try {
    return (await readdir(directory)).length > 0;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

export async function writeBackup({
  outputDirectory,
  tables,
  projectRef,
  gitSha = null,
  migrations = [],
  createdAt = new Date().toISOString(),
  force = false,
}) {
  const output = path.resolve(outputDirectory);
  if (!force && (await directoryHasEntries(output))) {
    throw new Error(`Backup output directory is not empty: ${output}`);
  }
  await mkdir(path.join(output, "tables"), { recursive: true });

  const tableManifest = {};
  const checksumLines = [];
  for (const table of TABLE_NAMES) {
    const sortedRows = sortTableRows(table, tables[table]);
    const bytes = jsonBytes(sortedRows);
    const relativeFile = `tables/${table}.json`;
    const digest = sha256(bytes);
    await writeFile(path.join(output, relativeFile), bytes, "utf8");
    tableManifest[table] = {
      file: relativeFile,
      rows: sortedRows.length,
      sha256: digest,
      primary_key: TABLE_SPECS[table].primaryKey,
    };
    checksumLines.push(`${digest}  ${relativeFile}`);
  }

  const manifest = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    created_at: createdAt,
    source: {
      project_ref: projectRef,
      git_sha: gitSha,
    },
    schema: { migrations },
    snapshot_sha256: snapshotFingerprint(tables),
    tables: tableManifest,
  };
  const manifestBytes = jsonBytes(manifest);
  await writeFile(path.join(output, "manifest.json"), manifestBytes, "utf8");
  checksumLines.push(`${sha256(manifestBytes)}  manifest.json`);
  await writeFile(path.join(output, "SHA256SUMS"), `${checksumLines.join("\n")}\n`, "utf8");

  return { output, manifest };
}

function primaryKeyValue(table, row) {
  return TABLE_SPECS[table].primaryKey.map((column) => String(row[column])).join("\u0000");
}

function validateColumns(table, rows) {
  const expected = [...TABLE_SPECS[table].columns].sort().join("|");
  for (const [index, row] of rows.entries()) {
    const actual = Object.keys(row).sort().join("|");
    if (actual !== expected) {
      throw new Error(`${table}[${index}] columns differ from the backup contract`);
    }
  }
}

function validateUniqueKeys(table, rows) {
  const keys = new Set();
  for (const row of rows) {
    const key = primaryKeyValue(table, row);
    if (keys.has(key)) throw new Error(`${table} contains duplicate primary key ${key}`);
    keys.add(key);
  }
}

function validateRelations(tables) {
  const dynastyIds = new Set(tables.dynasties.map((row) => row.id));
  const placeIds = new Set(tables.places.map((row) => row.id));
  const poemsById = new Map(tables.poems.map((row) => [row.id, row]));
  for (const poem of tables.poems) {
    if (!dynastyIds.has(poem.dynasty_id)) {
      throw new Error(`poem ${poem.id} references missing dynasty ${poem.dynasty_id}`);
    }
  }

  const placesByPoem = new Map();
  for (const relation of tables.poem_places) {
    if (!poemsById.has(relation.poem_id)) {
      throw new Error(`poem_places references missing poem ${relation.poem_id}`);
    }
    if (!placeIds.has(relation.place_id)) {
      throw new Error(`poem_places references missing place ${relation.place_id}`);
    }
    const relatedPlaces = placesByPoem.get(relation.poem_id) ?? new Set();
    relatedPlaces.add(relation.place_id);
    placesByPoem.set(relation.poem_id, relatedPlaces);
  }

  const expectedAuthors = new Map();
  for (const poem of tables.poems) {
    const stats = expectedAuthors.get(poem.author) ?? {
      dynasty: poem.dynasty,
      poemIds: new Set(),
      placeIds: new Set(),
    };
    stats.poemIds.add(poem.id);
    for (const placeId of placesByPoem.get(poem.id) ?? []) stats.placeIds.add(placeId);
    expectedAuthors.set(poem.author, stats);
  }
  for (const [name, stats] of [...expectedAuthors]) {
    if (stats.poemIds.size < 3) expectedAuthors.delete(name);
  }

  if (tables.authors.length !== expectedAuthors.size) {
    throw new Error(
      `authors row count ${tables.authors.length} does not match derived count ${expectedAuthors.size}`,
    );
  }
  for (const author of tables.authors) {
    const stats = expectedAuthors.get(author.name);
    if (
      !stats ||
      author.dynasty !== stats.dynasty ||
      author.poem_count !== stats.poemIds.size ||
      author.place_count !== stats.placeIds.size
    ) {
      throw new Error(`author statistics differ for ${author.name}`);
    }
  }
}

function sameMigrations(left, right) {
  return jsonBytes(left) === jsonBytes(right);
}

export async function readAndVerifyBackup(
  inputDirectory,
  { migrationDirectory, maxAgeHours } = {},
) {
  const input = path.resolve(inputDirectory);
  const manifestPath = path.join(input, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (manifest.format !== BACKUP_FORMAT || manifest.version !== BACKUP_VERSION) {
    throw new Error("Unsupported database backup format or version");
  }
  if (!manifest.source?.project_ref || !manifest.created_at) {
    throw new Error("Backup manifest is missing source or creation metadata");
  }
  if (
    !Array.isArray(manifest.schema?.migrations) ||
    manifest.schema.migrations.length === 0 ||
    manifest.schema.migrations.some(
      (migration) =>
        !/^[0-9][A-Za-z0-9_.-]*\.sql$/.test(migration.filename) ||
        !/^[a-f0-9]{64}$/.test(migration.sha256),
    )
  ) {
    throw new Error("Backup manifest contains invalid migration metadata");
  }

  const createdAt = Date.parse(manifest.created_at);
  if (!Number.isFinite(createdAt)) throw new Error("Backup created_at is invalid");
  if (maxAgeHours !== undefined) {
    const ageHours = (Date.now() - createdAt) / 3_600_000;
    if (ageHours < -1 || ageHours > maxAgeHours) {
      throw new Error(`Backup age ${ageHours.toFixed(1)}h exceeds ${maxAgeHours}h`);
    }
  }

  const manifestTables = Object.keys(manifest.tables ?? {}).sort();
  if (manifestTables.join("|") !== [...TABLE_NAMES].sort().join("|")) {
    throw new Error("Backup manifest table set differs from the backup contract");
  }

  const tables = {};
  for (const table of TABLE_NAMES) {
    const entry = manifest.tables[table];
    const expectedFile = `tables/${table}.json`;
    if (entry.file !== expectedFile) throw new Error(`Unsafe or unexpected file for ${table}`);
    const bytes = await readFile(path.join(input, expectedFile));
    if (sha256(bytes) !== entry.sha256) throw new Error(`${table} checksum mismatch`);
    const rows = JSON.parse(bytes.toString("utf8"));
    if (!Array.isArray(rows) || rows.length !== entry.rows) {
      throw new Error(`${table} row count differs from manifest`);
    }
    validateColumns(table, rows);
    validateUniqueKeys(table, rows);
    tables[table] = sortTableRows(table, rows);
  }

  validateRelations(tables);
  if (snapshotFingerprint(tables) !== manifest.snapshot_sha256) {
    throw new Error("Backup snapshot fingerprint mismatch");
  }

  if (migrationDirectory) {
    const currentMigrations = await migrationChecksums(migrationDirectory);
    if (!sameMigrations(currentMigrations, manifest.schema?.migrations ?? [])) {
      throw new Error("Backup migration checksums differ from the current repository");
    }
  }

  return { input, manifest, tables };
}

export async function assertRemoteSchema(url, key) {
  const response = await fetch(`${url}/rest/v1/`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/openapi+json",
    },
  });
  if (!response.ok) throw new Error(`OpenAPI request failed with HTTP ${response.status}`);
  const specification = await response.json();
  const schemas = specification.definitions ?? specification.components?.schemas ?? {};
  for (const [table, spec] of Object.entries(TABLE_SPECS)) {
    const actual = Object.keys(schemas[table]?.properties ?? {}).sort();
    const expected = [...spec.columns].sort();
    if (actual.join("|") !== expected.join("|")) {
      throw new Error(`${table} schema differs from the restore contract`);
    }
  }
}

export async function fileExists(filename) {
  try {
    await stat(filename);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}
