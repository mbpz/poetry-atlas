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

function isWriteBlocked(error) {
  return Boolean(
    error &&
      (error.code === "42501" ||
        /permission denied|row-level security|violates row-level security/i.test(
          error.message,
        )),
  );
}

async function cleanupRow(table, match) {
  const { error } = await service.from(table).delete().match(match);
  if (error) throw new Error(`cleanup ${table}: ${error.message}`);
}

async function checkAnonymousWritesBlocked() {
  const suffix = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const servicePlaceId = `security-service-place-${suffix}`;
  const servicePoemId = crypto.randomUUID();
  const serviceDynastyId = `security-service-dynasty-${suffix}`;
  const serviceAuthorId = crypto.randomUUID();
  const serviceAuthorName = `安全检查作者-${suffix}`;
  const sortOrder = 2_000_000_000 - (Date.now() % 1_000_000);

  const serviceRows = [
    {
      table: "places",
      row: {
        id: servicePlaceId,
        name: "安全检查服务端地点",
        type: "city",
        lng: 0,
        lat: 0,
        ancient_names: [],
      },
      match: { id: servicePlaceId },
      update: { name: "匿名更新不应成功" },
      verifyColumn: "name",
      originalValue: "安全检查服务端地点",
    },
    {
      table: "dynasties",
      row: {
        id: serviceDynastyId,
        name: `安全检查朝代-${suffix}`,
        name_en: "Security check",
        sort_order: sortOrder,
      },
      match: { id: serviceDynastyId },
      update: { name_en: "Anonymous update must fail" },
      verifyColumn: "name_en",
      originalValue: "Security check",
    },
    {
      table: "authors",
      row: {
        id: serviceAuthorId,
        name: serviceAuthorName,
        dynasty: "测试",
        poem_count: 0,
        place_count: 0,
      },
      match: { id: serviceAuthorId },
      update: { dynasty: "匿名更新不应成功" },
      verifyColumn: "dynasty",
      originalValue: "测试",
    },
    {
      table: "poems",
      row: {
        id: servicePoemId,
        title: `安全检查诗-${suffix}`,
        author: serviceAuthorName,
        dynasty: "唐",
        dynasty_id: "tang",
        content: "安全检查服务端临时正文。",
      },
      match: { id: servicePoemId },
      update: { content: "匿名更新不应成功。" },
      verifyColumn: "content",
      originalValue: "安全检查服务端临时正文。",
    },
  ];

  const anonymousInsertRows = [
    {
      table: "places",
      row: {
        id: `security-anon-place-${suffix}`,
        name: "匿名插入不应成功",
        type: "city",
        lng: 0,
        lat: 0,
        ancient_names: [],
      },
      match: { id: `security-anon-place-${suffix}` },
    },
    {
      table: "dynasties",
      row: {
        id: `security-anon-dynasty-${suffix}`,
        name: `匿名插入朝代-${suffix}`,
        name_en: "Anonymous insert must fail",
        sort_order: sortOrder - 1,
      },
      match: { id: `security-anon-dynasty-${suffix}` },
    },
    {
      table: "authors",
      row: {
        id: crypto.randomUUID(),
        name: `匿名插入作者-${suffix}`,
        dynasty: "测试",
        poem_count: 0,
        place_count: 0,
      },
      match: { name: `匿名插入作者-${suffix}` },
    },
    {
      table: "poems",
      row: {
        id: crypto.randomUUID(),
        title: `匿名插入诗-${suffix}`,
        author: `匿名插入作者-${suffix}`,
        dynasty: "唐",
        dynasty_id: "tang",
        content: "匿名插入不应成功。",
      },
      match: {
        title: `匿名插入诗-${suffix}`,
        author: `匿名插入作者-${suffix}`,
      },
    },
  ];

  try {
    for (const item of serviceRows) {
      const { error } = await service.from(item.table).insert(item.row);
      if (error) throw new Error(`prepare ${item.table}: ${error.message}`);
    }

    for (const item of anonymousInsertRows) {
      const { error } = await anonymous.from(item.table).insert(item.row);
      if (!error) {
        await cleanupRow(item.table, item.match);
        recordFailure(`anonymous INSERT on ${item.table} unexpectedly succeeded`);
      } else if (!isWriteBlocked(error)) {
        recordFailure(`anonymous INSERT on ${item.table} failed unexpectedly: ${error.message}`);
      }
    }

    const relationMatch = { poem_id: servicePoemId, place_id: servicePlaceId };
    const { error: relationInsertError } = await anonymous.from("poem_places").insert({
      ...relationMatch,
      relation_type: "description",
    });
    if (!relationInsertError) {
      await cleanupRow("poem_places", relationMatch);
      recordFailure("anonymous INSERT on poem_places unexpectedly succeeded");
    } else if (!isWriteBlocked(relationInsertError)) {
      recordFailure(
        `anonymous INSERT on poem_places failed unexpectedly: ${relationInsertError.message}`,
      );
    }

    const { error: prepareRelationError } = await service.from("poem_places").insert({
      ...relationMatch,
      relation_type: "description",
    });
    if (prepareRelationError) {
      throw new Error(`prepare poem_places: ${prepareRelationError.message}`);
    }

    const mutationRows = [
      ...serviceRows,
      {
        table: "poem_places",
        match: relationMatch,
        update: { relation_type: "anonymous-update-must-fail" },
        verifyColumn: "relation_type",
        originalValue: "description",
      },
    ];

    for (const item of mutationRows) {
      const { data: updated, error: updateError } = await anonymous
        .from(item.table)
        .update(item.update)
        .match(item.match)
        .select(item.verifyColumn);
      if (updated?.length) {
        recordFailure(`anonymous UPDATE on ${item.table} unexpectedly succeeded`);
      } else if (updateError && !isWriteBlocked(updateError)) {
        recordFailure(
          `anonymous UPDATE on ${item.table} failed unexpectedly: ${updateError.message}`,
        );
      }

      const { data: stored, error: verifyError } = await service
        .from(item.table)
        .select(item.verifyColumn)
        .match(item.match)
        .maybeSingle();
      if (verifyError) throw new Error(`verify ${item.table}: ${verifyError.message}`);
      if (!stored || stored[item.verifyColumn] !== item.originalValue) {
        recordFailure(`anonymous UPDATE changed ${item.table}`);
      }
    }

    for (const item of [...mutationRows].reverse()) {
      const { data: deleted, error: deleteError } = await anonymous
        .from(item.table)
        .delete()
        .match(item.match)
        .select(item.verifyColumn);
      if (deleted?.length) {
        recordFailure(`anonymous DELETE on ${item.table} unexpectedly succeeded`);
      } else if (deleteError && !isWriteBlocked(deleteError)) {
        recordFailure(
          `anonymous DELETE on ${item.table} failed unexpectedly: ${deleteError.message}`,
        );
      }

      const { count, error: verifyError } = await service
        .from(item.table)
        .select("*", { count: "exact", head: true })
        .match(item.match);
      if (verifyError) throw new Error(`verify ${item.table}: ${verifyError.message}`);
      if (count !== 1) recordFailure(`anonymous DELETE changed ${item.table}`);
    }
  } finally {
    await cleanupRow("poem_places", {
      poem_id: servicePoemId,
      place_id: servicePlaceId,
    });
    await cleanupRow("poems", { id: servicePoemId });
    await cleanupRow("places", { id: servicePlaceId });
    await cleanupRow("authors", { id: serviceAuthorId });
    await cleanupRow("dynasties", { id: serviceDynastyId });
  }
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

  await checkAnonymousWritesBlocked();
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
