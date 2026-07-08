import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("q")?.trim();
  const typeFilter = searchParams.get("type"); // 维度过滤
  const dynastyFilter = searchParams.get("dynasty"); // 朝代过滤

  if (!keyword || keyword.length < 1) {
    return NextResponse.json({ results: [] });
  }

  // 搜索诗词（标题/作者/内容/古地名）
  const { data: poems, error } = await supabase
    .from("poems")
    .select("id, title, author, dynasty, content")
    .or(`title.ilike.%${keyword}%,author.ilike.%${keyword}%,content.ilike.%${keyword}%`)
    .limit(50);

  // 搜索匹配古地名的地点
  const { data: matchedPlaces } = await supabase
    .from("places")
    .select("id")
    .contains("ancient_names", [keyword])
    .limit(10);

  const placeIds = (matchedPlaces ?? []).map((p) => p.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 关联地点（诗词关联 + 古地名匹配）
  const poemIds = (poems ?? []).map((p) => p.id);
  if (poemIds.length === 0 && placeIds.length === 0) {
    return NextResponse.json({ results: [] });
  }

  const { data: poemPlaces } = await supabase
    .from("poem_places")
    .select("poem_id, places(id, name, type)")
    .in("poem_id", poemIds.length > 0 ? poemIds : [""]);

  const placeMap = new Map<string, { id: string; name: string; type: string }[]>();
  (poemPlaces ?? []).forEach((pp: any) => {
    if (!placeMap.has(pp.poem_id)) placeMap.set(pp.poem_id, []);
    if (pp.places) placeMap.get(pp.poem_id)!.push(pp.places);
  });

  // 古地名匹配的地点也作为搜索结果
  const { data: ancientPlacePoems } = await supabase
    .from("poem_places")
    .select("poem_id, places(id, name, type)")
    .in("place_id", placeIds.length > 0 ? placeIds : [""]);

  (ancientPlacePoems ?? []).forEach((pp: any) => {
    if (pp.places && !placeMap.has(pp.poem_id)) {
      placeMap.set(pp.poem_id, []);
    }
    if (pp.places && placeMap.has(pp.poem_id) && !placeMap.get(pp.poem_id)!.find(x => x.id === pp.places.id)) {
      placeMap.get(pp.poem_id)!.push(pp.places);
    }
  });

  // 合并古地名匹配到的诗词
  const ancientPoemIds = (ancientPlacePoems ?? []).map(pp => pp.poem_id).filter(id => !poemIds.includes(id));
  let extraPoems: any[] = [];
  if (ancientPoemIds.length > 0) {
    const { data } = await supabase
      .from("poems")
      .select("id, title, author, dynasty, content")
      .in("id", ancientPoemIds);
    extraPoems = data ?? [];
  }

  const allPoems = [...(poems ?? []), ...extraPoems];

  // 维度过滤
  let results = allPoems.map((p) => ({
    ...p,
    places: placeMap.get(p.id) ?? [],
  }));

  if (typeFilter && typeFilter !== "all") {
    results = results.filter((r) => r.places.some((pl: { type: string }) => pl.type === typeFilter));
  }

  if (dynastyFilter && dynastyFilter !== "all") {
    // 将朝代 ID 转为中文名（如 tang → 唐），再按 dynasty 文本过滤
    const { data: dynRow } = await supabase
      .from("dynasties")
      .select("name")
      .eq("id", dynastyFilter)
      .single();
    if (dynRow?.name) {
      results = results.filter((r) => r.dynasty === dynRow.name);
    }
  }

  return NextResponse.json({ results });
}
