import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
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
    // 按朝代过滤：只返回该朝代有诗词的地点
    const { data: dynRow } = await supabase
      .from("dynasties")
      .select("name")
      .eq("id", dynasty)
      .single();

    if (dynRow?.name) {
      const { data } = await supabase
        .from("poem_places")
        .select("places(id,name,type,lng,lat)")
        .eq("poems.dynasty", dynRow.name)
        .limit(500);

      const places = (data ?? [])
        .map((r: any) => r.places)
        .filter(Boolean);

      // dedup
      const seen = new Set<string>();
      const unique = places.filter((p: any) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });

      return NextResponse.json({ places: unique });
    }
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ places: data ?? [] });
}
