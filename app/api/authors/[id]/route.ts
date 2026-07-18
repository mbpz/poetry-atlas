import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createServerSupabase();
  const { id } = await params;

  // 获取作者信息
  const { data: author, error: aErr } = await supabase
    .from("authors")
    .select("*")
    .eq("id", id)
    .single();

  if (aErr || !author) {
    return NextResponse.json({ error: "Author not found" }, { status: 404 });
  }

  // 获取作者足迹（地点 + 诗词数）
  const { data: route, error: rErr } = await supabase
    .from("author_routes")
    .select("place_id, place_name, place_type, lng, lat, poem_count_at_place")
    .eq("author_id", id)
    .order("poem_count_at_place", { ascending: false });

  if (rErr) {
    return NextResponse.json({ error: rErr.message }, { status: 500 });
  }

  // 获取该作者的代表作（每地点前3首）
  const { data: poems } = await supabase
    .from("poems")
    .select("id, title, author, dynasty, content")
    .eq("author", author.name)
    .limit(20);

  return NextResponse.json({
    author,
    route: route ?? [],
    poems: poems ?? [],
  });
}
