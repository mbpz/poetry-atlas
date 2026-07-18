import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

type PlaceRow = {
  id: string;
  name: string;
  type: string;
  lng: number;
  lat: number;
};

export async function GET(request: NextRequest) {
  const supabase = createServerSupabase();
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const dynasty = searchParams.get("dynasty");

  let query = supabase
    .from("places")
    .select("id,name,type,lng,lat")
    .order("name")
    .limit(500);

  if (type && type !== "all") {
    query = query.eq("type", type);
  }

  if (dynasty && dynasty !== "all") {
    // 先获取朝代中文名
    const { data: dynRow } = await supabase
      .from("dynasties")
      .select("name")
      .eq("id", dynasty)
      .single();

    if (dynRow?.name) {
      // 用 inner join 过滤该朝代有诗词的地点
      const { data, error } = await supabase
        .from("poem_places")
        .select("places(id,name,type,lng,lat),poems!inner(dynasty_id)")
        .eq("poems.dynasty", dynRow.name)
        .limit(500);

      if (error) {
        // 备用方案：直接查 poems 表
        const { data: poemData } = await supabase
          .from("poems")
          .select("id")
          .eq("dynasty", dynRow.name)
          .limit(200);

        const poemIds = (poemData ?? []).map((poem) => poem.id);
        if (poemIds.length === 0) {
          return NextResponse.json({ places: [] });
        }

        const { data: ppData } = await supabase
          .from("poem_places")
          .select("place_id")
          .in("poem_id", poemIds);

        const placeIds = [...new Set((ppData ?? []).map((row) => row.place_id))];
        if (placeIds.length === 0) {
          return NextResponse.json({ places: [] });
        }

        const { data: placesData } = await supabase
          .from("places")
          .select("id,name,type,lng,lat")
          .in("id", placeIds);

        return NextResponse.json({ places: placesData ?? [] });
      }

      const places = (
        (data ?? []) as unknown as Array<{ places: PlaceRow | null }>
      )
        .map((row) => row.places)
        .filter(Boolean);

      // dedup
      const seen = new Set<string>();
      return NextResponse.json({
        places: places.filter((place): place is PlaceRow => {
          if (!place || seen.has(place.id)) return false;
          seen.add(place.id);
          return true;
        }),
      });
    }
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ places: data ?? [] });
}
