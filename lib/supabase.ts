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
  dynasty_id?: string;
  content: string;
};

export type Place = {
  id: string;
  name: string;
  type: string;
  lng: number;
  lat: number;
  ancient_names?: string[];
};

export type PlaceWithPoems = Place & {
  poems: Poem[];
};

export const PLACE_TYPES: Record<string, { label: string; icon: string }> = {
  city: { label: "城市", icon: "🏙️" },
  tower: { label: "楼阁", icon: "🏯" },
  mountain: { label: "山川", icon: "⛰️" },
  lake: { label: "湖泊", icon: "🌊" },
  temple: { label: "寺庙", icon: "🛕" },
  pass: { label: "关隘", icon: "🏰" },
  river: { label: "江河", icon: "🏞️" },
  bridge: { label: "桥梁", icon: "🌉" },
  garden: { label: "园林", icon: "🌳" },
  palace: { label: "宫殿", icon: "🏛️" },
};

export async function fetchPlaces(type?: string, dynasty?: string): Promise<Place[]> {
  if (dynasty && dynasty !== "all") {
    // 先获取中文名
    const { data: dynRow } = await getSupabase()
      .from("dynasties")
      .select("name")
      .eq("id", dynasty)
      .single();
    const dynastyName = dynRow?.name;

    // 按朝代查询：只返回该朝代有诗词的地点
    const { data, error } = await getSupabase()
      .from("poem_places")
      .select("places(id,name,type,lng,lat,ancient_names)")
      .eq("poems.dynasty", dynastyName)
      .limit(200);
    if (error) throw error;
    const places = (
      (data ?? []) as unknown as Array<{ places: Place | null }>
    )
      .map((row) => row.places)
      .filter((place): place is Place => place !== null);
    // 去重
    const seen = new Set<string>();
    return places.filter((p: Place) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }

  let query = getSupabase()
    .from("places")
    .select("id,name,type,lng,lat,ancient_names")
    .order("name");
  if (type && type !== "all") {
    query = query.eq("type", type);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function fetchPlaceWithPoems(placeId: string): Promise<PlaceWithPoems> {
  const { data: place, error: pErr } = await getSupabase()
    .from("places")
    .select("id,name,type,lng,lat,ancient_names")
    .eq("id", placeId)
    .single();
  if (pErr) throw pErr;

  const { data: rows, error: ppErr } = await getSupabase()
    .from("poem_places")
    .select("poems(id,title,author,dynasty,content)")
    .eq("place_id", placeId);
  if (ppErr) throw ppErr;

  const poems = (
    (rows ?? []) as unknown as Array<{ poems: Poem | null }>
  )
    .map((row) => row.poems)
    .filter((poem): poem is Poem => poem !== null);

  return { ...place, poems };
}

export async function fetchPoemsByDynasty(dynasty: string): Promise<Poem[]> {
  const { data, error } = await getSupabase()
    .from("poems")
    .select("id,title,author,dynasty,content")
    .eq("dynasty", dynasty)
    .limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function searchPoems(keyword: string): Promise<Poem[]> {
  const { data, error } = await getSupabase()
    .from("poems")
    .select("id,title,author,dynasty,content")
    .or(`title.ilike.%${keyword}%,author.ilike.%${keyword}%,content.ilike.%${keyword}%`)
    .limit(50);
  if (error) throw error;
  return data ?? [];
}
