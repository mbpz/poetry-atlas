import { readFile } from "node:fs/promises";
import process from "node:process";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const DATA_PATH = new URL("../public/data/places.json", import.meta.url);
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PAGE_SIZE = 1000;

if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
  console.error(
    "Database check requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.",
  );
  process.exit(1);
}

if (SERVICE_KEY === ANON_KEY) {
  console.error("SUPABASE_SERVICE_ROLE_KEY must not be the public anon key.");
  process.exit(1);
}

const service = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anonymous = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const localPlaces = JSON.parse(await readFile(DATA_PATH, "utf8"));
const failures = [];

const DYNASTY_IDS = {
  先秦: "pre_qin",
  汉: "han",
  三国: "wei_jin",
  晋: "wei_jin",
  魏晋: "wei_jin",
  南北朝: "nanbei",
  隋: "sui",
  唐: "tang",
  五代: "wudai",
  宋: "song",
  金: "jin",
  元: "yuan",
  明: "ming",
  清: "qing",
  近现代: "modern",
  当代: "contemp",
};

const EXPECTED_COLUMNS = {
  places: ["ancient_names", "created_at", "id", "lat", "lng", "name", "type"],
  poems: [
    "author",
    "content",
    "created_at",
    "dynasty",
    "dynasty_id",
    "id",
    "title",
  ],
  poem_places: ["place_id", "poem_id", "relation_type"],
  dynasties: ["end_year", "id", "name", "name_en", "sort_order", "start_year"],
  authors: [
    "art_name",
    "avatar_url",
    "biography",
    "birth_year",
    "courtesy_name",
    "created_at",
    "death_year",
    "dynasty",
    "id",
    "name",
    "place_count",
    "poem_count",
  ],
  author_routes: [
    "author_id",
    "author_name",
    "dynasty",
    "lat",
    "lng",
    "place_count",
    "place_id",
    "place_name",
    "place_type",
    "poem_count",
    "poem_count_at_place",
  ],
};

function poemKey(poem) {
  return `${poem.title}\u0000${poem.author}`;
}

function relationKey(poemId, placeId) {
  return `${poemId}\u0000${placeId}`;
}

function sameStringArray(left = [], right = []) {
  return (
    left.length === right.length &&
    [...left].sort().every((value, index) => value === [...right].sort()[index])
  );
}

function recordFailure(message) {
  failures.push(message);
}

async function fetchAll(client, table, columns) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from(table)
      .select(columns)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
}

async function checkSchema() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Accept: "application/openapi+json",
    },
  });
  if (!response.ok) {
    throw new Error(`OpenAPI schema request failed with HTTP ${response.status}`);
  }

  const specification = await response.json();
  const schemas = specification.definitions ?? specification.components?.schemas ?? {};
  for (const [table, expected] of Object.entries(EXPECTED_COLUMNS)) {
    const actual = Object.keys(schemas[table]?.properties ?? {}).sort();
    if (actual.join("|") !== [...expected].sort().join("|")) {
      recordFailure(
        `${table} columns differ: expected [${expected.join(", ")}], received [${actual.join(", ")}]`,
      );
    }
  }

  if (!specification.paths?.["/rpc/search_poems"]) {
    recordFailure("OpenAPI schema does not expose /rpc/search_poems");
  }
}

async function checkCanonicalData() {
  const [remotePlaces, remotePoems, remoteRelations, remoteAuthors] =
    await Promise.all([
      fetchAll(service, "places", "id,name,type,lng,lat,ancient_names"),
      fetchAll(
        service,
        "poems",
        "id,title,author,dynasty,dynasty_id,content",
      ),
      fetchAll(service, "poem_places", "poem_id,place_id,relation_type"),
      fetchAll(service, "authors", "id,name,dynasty,poem_count,place_count"),
    ]);

  const localPoems = new Map();
  const localRelationKeys = new Set();
  for (const place of localPlaces) {
    for (const poem of place.poems) localPoems.set(poemKey(poem), poem);
  }

  if (remotePlaces.length !== localPlaces.length) {
    recordFailure(`places count: local ${localPlaces.length}, remote ${remotePlaces.length}`);
  }
  if (remotePoems.length !== localPoems.size) {
    recordFailure(`poems count: local ${localPoems.size}, remote ${remotePoems.length}`);
  }
  const localRelationCount = localPlaces.reduce(
    (count, place) => count + place.poems.length,
    0,
  );
  if (remoteRelations.length !== localRelationCount) {
    recordFailure(
      `poem_places count: local ${localRelationCount}, remote ${remoteRelations.length}`,
    );
  }

  const remotePlacesById = new Map(remotePlaces.map((place) => [place.id, place]));
  for (const local of localPlaces) {
    const remote = remotePlacesById.get(local.id);
    if (!remote) {
      recordFailure(`remote place missing: ${local.id}`);
      continue;
    }
    if (
      remote.name !== local.name ||
      remote.type !== local.type ||
      Number(remote.lng) !== local.lng ||
      Number(remote.lat) !== local.lat ||
      !sameStringArray(remote.ancient_names, local.ancient_names ?? [])
    ) {
      recordFailure(`remote place differs: ${local.id}`);
    }
  }

  const remotePoemsByKey = new Map(remotePoems.map((poem) => [poemKey(poem), poem]));
  for (const [key, local] of localPoems) {
    const remote = remotePoemsByKey.get(key);
    if (!remote) {
      recordFailure(`remote poem missing: ${local.title} / ${local.author}`);
      continue;
    }
    if (
      remote.dynasty !== local.dynasty ||
      remote.dynasty_id !== DYNASTY_IDS[local.dynasty] ||
      remote.content !== local.content
    ) {
      recordFailure(`remote poem differs: ${local.title} / ${local.author}`);
    }
  }

  for (const place of localPlaces) {
    for (const poem of place.poems) {
      const remote = remotePoemsByKey.get(poemKey(poem));
      if (remote) localRelationKeys.add(relationKey(remote.id, place.id));
    }
  }
  const remoteRelationKeys = new Set(
    remoteRelations.map((relation) => relationKey(relation.poem_id, relation.place_id)),
  );
  for (const key of localRelationKeys) {
    if (!remoteRelationKeys.has(key)) recordFailure(`remote relation missing: ${key}`);
  }
  for (const relation of remoteRelations) {
    if (relation.relation_type !== "description") {
      recordFailure(
        `unexpected relation_type for ${relation.poem_id}/${relation.place_id}`,
      );
    }
  }

  const relationsByPoem = new Map();
  for (const relation of remoteRelations) {
    const placeIds = relationsByPoem.get(relation.poem_id) ?? new Set();
    placeIds.add(relation.place_id);
    relationsByPoem.set(relation.poem_id, placeIds);
  }
  const expectedAuthors = new Map();
  for (const poem of remotePoems) {
    const stats = expectedAuthors.get(poem.author) ?? {
      dynasty: poem.dynasty,
      poemIds: new Set(),
      placeIds: new Set(),
    };
    stats.poemIds.add(poem.id);
    for (const placeId of relationsByPoem.get(poem.id) ?? []) stats.placeIds.add(placeId);
    expectedAuthors.set(poem.author, stats);
  }
  for (const [name, stats] of [...expectedAuthors]) {
    if (stats.poemIds.size < 3) expectedAuthors.delete(name);
  }

  if (remoteAuthors.length !== expectedAuthors.size) {
    recordFailure(
      `authors count: expected ${expectedAuthors.size}, remote ${remoteAuthors.length}`,
    );
  }
  const remoteAuthorsByName = new Map(
    remoteAuthors.map((author) => [author.name, author]),
  );
  for (const [name, stats] of expectedAuthors) {
    const remote = remoteAuthorsByName.get(name);
    if (
      !remote ||
      remote.dynasty !== stats.dynasty ||
      remote.poem_count !== stats.poemIds.size ||
      remote.place_count !== stats.placeIds.size
    ) {
      recordFailure(`derived author differs: ${name}`);
    }
  }

  return {
    places: remotePlaces.length,
    poems: remotePoems.length,
    relations: remoteRelations.length,
    authors: remoteAuthors.length,
  };
}

async function checkPublicContract() {
  for (const [table, expectedCount] of [
    ["places", localPlaces.length],
    [
      "poems",
      new Set(localPlaces.flatMap((place) => place.poems.map(poemKey))).size,
    ],
    [
      "poem_places",
      localPlaces.reduce((count, place) => count + place.poems.length, 0),
    ],
  ]) {
    const { count, error } = await anonymous
      .from(table)
      .select("*", { count: "exact", head: true });
    if (error) recordFailure(`anonymous SELECT on ${table} failed: ${error.message}`);
    else if (count !== expectedCount) {
      recordFailure(`anonymous ${table} count: expected ${expectedCount}, received ${count}`);
    }
  }

  const { data: searchRows, error: searchError } = await anonymous.rpc(
    "search_poems",
    { keyword: "长安", type_filter: "all", dynasty_filter: "all" },
  );
  if (searchError) {
    recordFailure(`search_poems failed: ${searchError.message}`);
  } else if (!searchRows || searchRows.length === 0) {
    recordFailure("search_poems returned no results for ancient name 长安");
  } else {
    const expectedKeys = [
      "author",
      "content",
      "dynasty",
      "dynasty_id",
      "id",
      "places",
      "title",
    ];
    const actualKeys = Object.keys(searchRows[0]).sort();
    if (actualKeys.join("|") !== expectedKeys.join("|")) {
      recordFailure(`search_poems returned unexpected fields: ${actualKeys.join(", ")}`);
    }
  }

  const sentinelId = `security-check-${Date.now()}`;
  const { error: writeError } = await anonymous.from("places").insert({
    id: sentinelId,
    name: "安全检查临时记录",
    type: "city",
    lng: 0,
    lat: 0,
    ancient_names: [],
  });
  if (!writeError) {
    await service.from("places").delete().eq("id", sentinelId);
    recordFailure("anonymous INSERT unexpectedly succeeded");
  }
}

try {
  await checkSchema();
  const counts = await checkCanonicalData();
  await checkPublicContract();

  if (failures.length > 0) {
    console.error(`Database consistency check failed with ${failures.length} problem(s):`);
    for (const failure of failures.slice(0, 100)) console.error(`- ${failure}`);
    if (failures.length > 100) console.error(`- ... and ${failures.length - 100} more`);
    process.exitCode = 1;
  } else {
    console.log(
      `Database consistency check passed: ${counts.places} places, ${counts.poems} poems, ${counts.relations} relations, ${counts.authors} derived authors.`,
    );
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Database consistency check failed: ${message}`);
  process.exitCode = 1;
}
