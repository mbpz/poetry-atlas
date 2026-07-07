/**
 * Seed script: migrate data from places.json to Supabase
 * Run with: npx tsx supabase/seed.ts
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL=
 *   SUPABASE_SERVICE_ROLE_KEY=   (or run with anon key if RLS allows inserts)
 */

import { createClient } from "@supabase/supabase-js";
import placesData from "../public/data/places.json";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seed() {
  console.log(`Starting migration: ${placesData.length} places from places.json`);

  for (const place of placesData) {
    // 1. Insert place
    const { error: placeErr } = await supabase.from("places").insert({
      id: place.id,
      name: place.name,
      lng: place.lng,
      lat: place.lat,
    });
    if (placeErr && !placeErr.message.includes("duplicate")) {
      console.error(`  ✗ place ${place.name}: ${placeErr.message}`);
      continue;
    }

    // 2. Insert poems + join table
    for (const poem of place.poems) {
      // 先查重（同标题+作者认为是同一首）
      const { data: existing } = await supabase
        .from("poems")
        .select("id")
        .eq("title", poem.title)
        .eq("author", poem.author)
        .maybeSingle();

      let poemId: string;
      if (existing) {
        poemId = existing.id;
      } else {
        const { data: inserted, error: poemErr } = await supabase
          .from("poems")
          .insert({
            title: poem.title,
            author: poem.author,
            dynasty: poem.dynasty,
            content: poem.content,
          })
          .select("id")
          .single();
        if (poemErr) {
          console.error(`    ✗ poem ${poem.title}: ${poemErr.message}`);
          continue;
        }
        poemId = inserted.id;
      }

      // 3. Insert join (幂等：已存在则跳过)
      await supabase.from("poem_places").upsert(
        { poem_id: poemId, place_id: place.id, relation_type: "description" },
        { onConflict: "poem_id,place_id" }
      );
    }

    console.log(`  ✓ ${place.name} (${place.poems.length} poems)`);
  }

  console.log("\n✓ Migration complete.");
}

seed().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
