import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("q")?.trim() || "";
  const typeFilter = searchParams.get("type") || "all";
  const dynastyFilter = searchParams.get("dynasty") || "all";

  if (keyword.length < 2) {
    return NextResponse.json({ results: [] });
  }

  // 使用数据库函数搜索（PostgreSQL 原生 ILIKE，支持中文）
  const { data, error } = await supabase.rpc("search_poems", {
    keyword,
    type_filter: typeFilter,
    dynasty_filter: dynastyFilter,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 格式化输出
  const results = (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    author: row.author,
    dynasty: row.dynasty,
    dynasty_id: row.dynasty_id,
    content: row.content,
    annotation: row.annotation,
    translation: row.translation,
    appreciation: row.appreciation,
    places: row.places ?? [],
  }));

  return NextResponse.json({ results });
}
