import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("q")?.trim();

  if (!keyword || keyword.length < 1) {
    return NextResponse.json({ results: [] });
  }

  // 搜索诗词（标题/作者/内容）
  const { data: poems, error } = await supabase
    .from("poems")
    .select("id, title, author, dynasty, content")
    .or(`title.ilike.%${keyword}%,author.ilike.%${keyword}%,content.ilike.%${keyword}%`)
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 关联地点
  const poemIds = (poems ?? []).map((p) => p.id);
  if (poemIds.length === 0) {
    return NextResponse.json({ results: [] });
  }

  const { data: poemPlaces } = await supabase
    .from("poem_places")
    .select("poem_id, places(id, name, type)")
    .in("poem_id", poemIds);

  const placeMap = new Map<string, { id: string; name: string; type: string }[]>();
  (poemPlaces ?? []).forEach((pp: any) => {
    if (!placeMap.has(pp.poem_id)) placeMap.set(pp.poem_id, []);
    if (pp.places) placeMap.get(pp.poem_id)!.push(pp.places);
  });

  const results = (poems ?? []).map((p) => ({
    ...p,
    places: placeMap.get(p.id) ?? [],
  }));

  return NextResponse.json({ results });
}
