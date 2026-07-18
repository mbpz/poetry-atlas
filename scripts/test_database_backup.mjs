import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  readAndVerifyBackup,
  writeBackup,
} from "./lib/database_backup.mjs";

const createdAt = "2026-01-01T00:00:00.000Z";
const author = "测试作者";
const poemIds = [
  "00000000-0000-4000-8000-000000000001",
  "00000000-0000-4000-8000-000000000002",
  "00000000-0000-4000-8000-000000000003",
];
const tables = {
  dynasties: [
    {
      id: "test",
      name: "测试",
      name_en: "Test",
      start_year: 1,
      end_year: 2,
      sort_order: 1,
    },
  ],
  places: [
    {
      id: "test-place",
      name: "测试地点",
      type: "city",
      lng: 1,
      lat: 2,
      ancient_names: ["测试古名"],
      created_at: createdAt,
    },
  ],
  poems: poemIds.map((id, index) => ({
    id,
    title: `测试诗${index + 1}`,
    author,
    dynasty: "测试",
    dynasty_id: "test",
    content: `测试正文${index + 1}。`,
    created_at: createdAt,
  })),
  poem_places: poemIds.map((poemId) => ({
    poem_id: poemId,
    place_id: "test-place",
    relation_type: "description",
  })),
  authors: [
    {
      id: "00000000-0000-4000-8000-000000000010",
      name: author,
      dynasty: "测试",
      birth_year: null,
      death_year: null,
      courtesy_name: null,
      art_name: null,
      biography: null,
      avatar_url: null,
      poem_count: 3,
      place_count: 1,
      created_at: createdAt,
    },
  ],
};

const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "poetry-atlas-backup-test-"));
try {
  await writeBackup({
    outputDirectory: temporaryDirectory,
    tables,
    projectRef: "test-project",
    gitSha: "test-sha",
    migrations: [{ filename: "20260101000000_test.sql", sha256: "a".repeat(64) }],
    createdAt,
  });
  const verified = await readAndVerifyBackup(temporaryDirectory);
  if (verified.manifest.tables.poems.rows !== 3) {
    throw new Error("Valid fixture returned the wrong poem count");
  }

  const placesFile = path.join(temporaryDirectory, "tables/places.json");
  const originalPlaces = await readFile(placesFile, "utf8");
  await writeFile(placesFile, `${originalPlaces} `, "utf8");
  let corruptionDetected = false;
  try {
    await readAndVerifyBackup(temporaryDirectory);
  } catch (error) {
    corruptionDetected = /checksum mismatch/.test(String(error));
  }
  if (!corruptionDetected) throw new Error("Backup corruption was not detected");

  console.log("Database backup tests passed: valid snapshot accepted, corruption rejected.");
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
