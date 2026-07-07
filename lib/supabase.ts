import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    supabase = createClient(url, key);
  }
  return supabase;
}

export type Poem = {
  id: string;
  title: string;
  author: string;
  dynasty: string;
  content: string;
};

export type Place = {
  id: string;
  name: string;
  lng: number;
  lat: number;
};

export type PlaceWithPoems = Place & {
  poems: Poem[];
};

export async function fetchPlaces(): Promise<Place[]> {
  const { data, error } = await getSupabase()
    .from("places")
    .select("id,name,lng,lat")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function fetchPlaceWithPoems(placeId: string): Promise<PlaceWithPoems> {
  const { data: place, error: pErr } = await getSupabase()
    .from("places")
    .select("id,name,lng,lat")
    .eq("id", placeId)
    .single();
  if (pErr) throw pErr;

  const { data: rows, error: ppErr } = await getSupabase()
    .from("poem_places")
    .select("poems(id,title,author,dynasty,content)")
    .eq("place_id", placeId);
  if (ppErr) throw ppErr;

  const poems = (rows ?? [])
    .map((r: any) => r.poems)
    .filter(Boolean);

  return { ...place, poems };
}
