/**
 * Seed script: migrate data from places.json to Supabase
 * Run with: npm run seed:data
 * Remove poems that are no longer in the canonical dataset with:
 * npm run seed:data -- --prune
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL=
 *   SUPABASE_SERVICE_ROLE_KEY=
 */

import { createClient } from "@supabase/supabase-js";
import { loadEnvConfig } from "@next/env";
import placesData from "../public/data/places.json";

loadEnvConfig(process.cwd());

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SHOULD_PRUNE = process.argv.includes("--prune");

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "Missing env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seed() {
  console.log(`Starting migration: ${placesData.length} places from places.json`);
  const seededPoemIds = new Set<string>();
  const seededPlaceIds = new Set<string>();
  let insertedPoems = 0;
  let updatedPoems = 0;
  let failedOperations = 0;

  for (const place of placesData) {
    // 1. Upsert place
    const { error: placeErr } = await supabase.from("places").upsert(
      {
        id: place.id,
        name: place.name,
        lng: place.lng,
        lat: place.lat,
      },
      { onConflict: "id" },
    );
    if (placeErr) {
      console.error(`  ✗ place ${place.name}: ${placeErr.message}`);
      failedOperations += 1;
      continue;
    }
    seededPlaceIds.add(place.id);

    // 2. Insert poems + join table
    for (const poem of place.poems) {
      // 先查重（同标题+作者认为是同一首）
      const { data: existing, error: lookupErr } = await supabase
        .from("poems")
        .select("id")
        .eq("title", poem.title)
        .eq("author", poem.author)
        .limit(1)
        .maybeSingle();

      if (lookupErr) {
        console.error(`    ✗ lookup ${poem.title}: ${lookupErr.message}`);
        failedOperations += 1;
        continue;
      }

      const poemPayload = {
        title: poem.title,
        author: poem.author,
        dynasty: poem.dynasty,
        content: poem.content,
      };

      let poemId: string;
      if (existing) {
        poemId = existing.id;
        const { error: updateErr } = await supabase
          .from("poems")
          .update(poemPayload)
          .eq("id", poemId);
        if (updateErr) {
          console.error(`    ✗ update ${poem.title}: ${updateErr.message}`);
          failedOperations += 1;
          continue;
        }
        updatedPoems += 1;
      } else {
        const { data: inserted, error: poemErr } = await supabase
          .from("poems")
          .insert(poemPayload)
          .select("id")
          .single();
        if (poemErr) {
          console.error(`    ✗ poem ${poem.title}: ${poemErr.message}`);
          failedOperations += 1;
          continue;
        }
        poemId = inserted.id;
        insertedPoems += 1;
      }
      seededPoemIds.add(poemId);

      // 3. Insert join (幂等：已存在则跳过)
      const { error: relationErr } = await supabase.from("poem_places").upsert(
        { poem_id: poemId, place_id: place.id, relation_type: "description" },
        { onConflict: "poem_id,place_id" }
      );
      if (relationErr) {
        console.error(`    ✗ relation ${poem.title}: ${relationErr.message}`);
        failedOperations += 1;
      }
    }

    console.log(`  ✓ ${place.name} (${place.poems.length} poems)`);
  }

  let prunedPoems = 0;
  let prunedPlaces = 0;
  if (SHOULD_PRUNE) {
    if (failedOperations > 0) {
      throw new Error(
        `Refusing to prune after ${failedOperations} failed seed operation(s). Fix the errors and retry.`,
      );
    }

    const pageSize = 1000;
    const databasePoemIds: string[] = [];
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from("poems")
        .select("id")
        .range(from, from + pageSize - 1);
      if (error) throw error;
      databasePoemIds.push(...data.map((poem) => poem.id));
      if (data.length < pageSize) break;
    }

    const staleIds = databasePoemIds.filter((id) => !seededPoemIds.has(id));
    for (let index = 0; index < staleIds.length; index += 500) {
      const batch = staleIds.slice(index, index + 500);
      const { error } = await supabase.from("poems").delete().in("id", batch);
      if (error) throw error;
      prunedPoems += batch.length;
    }

    const databasePlaceIds: string[] = [];
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from("places")
        .select("id")
        .range(from, from + pageSize - 1);
      if (error) throw error;
      databasePlaceIds.push(...data.map((place) => place.id));
      if (data.length < pageSize) break;
    }

    const stalePlaceIds = databasePlaceIds.filter((id) => !seededPlaceIds.has(id));
    for (let index = 0; index < stalePlaceIds.length; index += 500) {
      const batch = stalePlaceIds.slice(index, index + 500);
      const { error } = await supabase.from("places").delete().in("id", batch);
      if (error) throw error;
      prunedPlaces += batch.length;
    }
  }

  console.log(
    `\n✓ Migration complete: ${insertedPoems} poems inserted, ${updatedPoems} poems updated, ` +
      `${prunedPoems} poems pruned, ${prunedPlaces} places pruned, ` +
      `${failedOperations} operation(s) failed.`,
  );
}

seed().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
