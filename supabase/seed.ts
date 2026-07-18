/**
 * Synchronize the canonical places.json dataset to Supabase.
 *
 * Run:
 *   npm run seed:data
 *   npm run seed:data -- --prune
 *
 * `--prune` removes rows outside the canonical dataset. The authors table is
 * always rebuilt as derived data from the poems and poem_places currently in
 * Supabase.
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnvConfig } from "@next/env";
import placesJson from "../public/data/places.json";

loadEnvConfig(process.cwd());

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SHOULD_PRUNE = process.argv.includes("--prune");
const PAGE_SIZE = 1000;
const BATCH_SIZE = 500;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local/.env",
  );
}

if (ANON_KEY && SUPABASE_KEY === ANON_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY must not be the public anon key");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type CanonicalPoem = {
  title: string;
  author: string;
  dynasty: string;
  content: string;
};

type CanonicalPlace = {
  id: string;
  name: string;
  type: string;
  lng: number;
  lat: number;
  ancient_names?: string[];
  poems: CanonicalPoem[];
};

type DatabasePoem = {
  id: string;
  title: string;
  author: string;
  dynasty: string;
};

type DatabaseRelation = {
  poem_id: string;
  place_id: string;
};

const places = placesJson as CanonicalPlace[];

const DYNASTY_IDS: Record<string, string> = {
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

function poemKey(poem: Pick<CanonicalPoem, "title" | "author">): string {
  return `${poem.title}\u0000${poem.author}`;
}

function relationKey(poemId: string, placeId: string): string {
  return `${poemId}\u0000${placeId}`;
}

function batches<T>(values: T[]): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += BATCH_SIZE) {
    result.push(values.slice(index, index + BATCH_SIZE));
  }
  return result;
}

async function fetchAll<T>(table: string, columns: string): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data as T[]));
    if (data.length < PAGE_SIZE) break;
  }
  return rows;
}

async function deleteIds(table: string, ids: string[]): Promise<number> {
  let deleted = 0;
  for (const batch of batches(ids)) {
    const { error } = await supabase.from(table).delete().in("id", batch);
    if (error) throw error;
    deleted += batch.length;
  }
  return deleted;
}

async function syncPlaces(): Promise<void> {
  const payload = places.map((place) => ({
    id: place.id,
    name: place.name,
    type: place.type,
    lng: place.lng,
    lat: place.lat,
    ancient_names: place.ancient_names ?? [],
  }));

  for (const batch of batches(payload)) {
    const { error } = await supabase
      .from("places")
      .upsert(batch, { onConflict: "id" });
    if (error) throw error;
  }
}

async function syncPoems(): Promise<Map<string, string>> {
  const canonicalPoems = new Map<string, CanonicalPoem>();
  for (const place of places) {
    for (const poem of place.poems) {
      const dynastyId = DYNASTY_IDS[poem.dynasty];
      if (!dynastyId) {
        throw new Error(`Unmapped dynasty: ${poem.dynasty} (${poem.title})`);
      }

      const key = poemKey(poem);
      const previous = canonicalPoems.get(key);
      if (
        previous &&
        (previous.content !== poem.content || previous.dynasty !== poem.dynasty)
      ) {
        throw new Error(`Conflicting canonical poem rows: ${poem.title} / ${poem.author}`);
      }
      canonicalPoems.set(key, poem);
    }
  }

  const databasePoems = await fetchAll<DatabasePoem>(
    "poems",
    "id,title,author,dynasty",
  );
  const existingByKey = new Map<string, DatabasePoem>();
  for (const poem of databasePoems) {
    const key = poemKey(poem);
    if (existingByKey.has(key)) {
      throw new Error(`Duplicate database poem rows: ${poem.title} / ${poem.author}`);
    }
    existingByKey.set(key, poem);
  }

  const poemIds = new Map<string, string>();
  const updates: Array<CanonicalPoem & { id: string; dynasty_id: string }> = [];
  const inserts: Array<CanonicalPoem & { dynasty_id: string }> = [];
  for (const poem of canonicalPoems.values()) {
    const payload = { ...poem, dynasty_id: DYNASTY_IDS[poem.dynasty] };
    const existing = existingByKey.get(poemKey(poem));
    if (existing) updates.push({ id: existing.id, ...payload });
    else inserts.push(payload);
  }

  for (const batch of batches(updates)) {
    const { data, error } = await supabase
      .from("poems")
      .upsert(batch, { onConflict: "id" })
      .select("id,title,author");
    if (error) throw error;
    for (const poem of data) {
      poemIds.set(poemKey(poem), poem.id);
    }
  }

  for (const batch of batches(inserts)) {
    const { data, error } = await supabase
      .from("poems")
      .insert(batch)
      .select("id,title,author");
    if (error) throw error;
    for (const poem of data) {
      poemIds.set(poemKey(poem), poem.id);
    }
  }

  if (poemIds.size !== canonicalPoems.size) {
    throw new Error(
      `Expected ${canonicalPoems.size} poem IDs after upsert, received ${poemIds.size}`,
    );
  }

  return poemIds;
}

async function syncRelations(poemIds: Map<string, string>): Promise<Set<string>> {
  const canonicalRelations = new Map<string, DatabaseRelation & { relation_type: string }>();
  for (const place of places) {
    for (const poem of place.poems) {
      const poemId = poemIds.get(poemKey(poem));
      if (!poemId) throw new Error(`Missing database ID for ${poem.title} / ${poem.author}`);
      canonicalRelations.set(relationKey(poemId, place.id), {
        poem_id: poemId,
        place_id: place.id,
        relation_type: "description",
      });
    }
  }

  for (const batch of batches([...canonicalRelations.values()])) {
    const { error } = await supabase
      .from("poem_places")
      .upsert(batch, { onConflict: "poem_id,place_id" });
    if (error) throw error;
  }

  return new Set(canonicalRelations.keys());
}

async function pruneCanonicalRows(
  poemIds: Map<string, string>,
  relationKeys: Set<string>,
): Promise<{ poems: number; places: number; relations: number }> {
  if (!SHOULD_PRUNE) return { poems: 0, places: 0, relations: 0 };

  const databaseRelations = await fetchAll<DatabaseRelation>(
    "poem_places",
    "poem_id,place_id",
  );
  let prunedRelations = 0;
  for (const relation of databaseRelations) {
    if (relationKeys.has(relationKey(relation.poem_id, relation.place_id))) continue;
    const { error } = await supabase
      .from("poem_places")
      .delete()
      .eq("poem_id", relation.poem_id)
      .eq("place_id", relation.place_id);
    if (error) throw error;
    prunedRelations += 1;
  }

  const databasePoems = await fetchAll<{ id: string }>("poems", "id");
  const canonicalPoemIds = new Set(poemIds.values());
  const stalePoemIds = databasePoems
    .map((poem) => poem.id)
    .filter((id) => !canonicalPoemIds.has(id));
  const prunedPoems = await deleteIds("poems", stalePoemIds);

  const databasePlaces = await fetchAll<{ id: string }>("places", "id");
  const canonicalPlaceIds = new Set(places.map((place) => place.id));
  const stalePlaceIds = databasePlaces
    .map((place) => place.id)
    .filter((id) => !canonicalPlaceIds.has(id));
  const prunedPlaces = await deleteIds("places", stalePlaceIds);

  return { poems: prunedPoems, places: prunedPlaces, relations: prunedRelations };
}

async function rebuildAuthors(): Promise<{ upserted: number; pruned: number }> {
  const poems = await fetchAll<DatabasePoem>("poems", "id,title,author,dynasty");
  const relations = await fetchAll<DatabaseRelation>(
    "poem_places",
    "poem_id,place_id",
  );
  const placesByPoem = new Map<string, Set<string>>();
  for (const relation of relations) {
    const placeIds = placesByPoem.get(relation.poem_id) ?? new Set<string>();
    placeIds.add(relation.place_id);
    placesByPoem.set(relation.poem_id, placeIds);
  }

  const stats = new Map<
    string,
    { dynasty: string; poemIds: Set<string>; placeIds: Set<string> }
  >();
  for (const poem of poems) {
    const current = stats.get(poem.author) ?? {
      dynasty: poem.dynasty,
      poemIds: new Set<string>(),
      placeIds: new Set<string>(),
    };
    current.poemIds.add(poem.id);
    for (const placeId of placesByPoem.get(poem.id) ?? []) {
      current.placeIds.add(placeId);
    }
    stats.set(poem.author, current);
  }

  const eligibleAuthors = [...stats.entries()]
    .filter(([, stat]) => stat.poemIds.size >= 3)
    .map(([name, stat]) => ({
      name,
      dynasty: stat.dynasty,
      poem_count: stat.poemIds.size,
      place_count: stat.placeIds.size,
    }));

  for (const batch of batches(eligibleAuthors)) {
    const { error } = await supabase
      .from("authors")
      .upsert(batch, { onConflict: "name" });
    if (error) throw error;
  }

  const databaseAuthors = await fetchAll<{ id: string; name: string }>(
    "authors",
    "id,name",
  );
  const eligibleNames = new Set(eligibleAuthors.map((author) => author.name));
  const staleAuthorIds = databaseAuthors
    .filter((author) => !eligibleNames.has(author.name))
    .map((author) => author.id);
  const pruned = await deleteIds("authors", staleAuthorIds);

  return { upserted: eligibleAuthors.length, pruned };
}

async function seed(): Promise<void> {
  console.log(
    `Synchronizing ${places.length} canonical places${SHOULD_PRUNE ? " with pruning" : ""}...`,
  );

  await syncPlaces();
  const poemIds = await syncPoems();
  const relationKeys = await syncRelations(poemIds);
  const pruned = await pruneCanonicalRows(poemIds, relationKeys);
  const authors = await rebuildAuthors();

  console.log(
    [
      "Supabase seed complete:",
      `${places.length} places`,
      `${poemIds.size} poems`,
      `${relationKeys.size} relations`,
      `${authors.upserted} derived authors`,
      `${pruned.places}/${pruned.poems}/${pruned.relations}/${authors.pruned} pruned places/poems/relations/authors`,
    ].join(" "),
  );
}

seed().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Supabase seed failed: ${message}`);
  process.exit(1);
});
