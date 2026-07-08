import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const minPoems = parseInt(searchParams.get("minPoems") || "5");

  const { data, error } = await supabase
    .from("authors")
    .select("id, name, dynasty, poem_count, place_count")
    .gte("poem_count", minPoems)
    .order("poem_count", { ascending: false })
    .limit(30);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ authors: data ?? [] });
}
