import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: place, error: pErr } = await supabase
    .from("places")
    .select("id,name,type,lng,lat,ancient_names")
    .eq("id", id)
    .single();

  if (pErr || !place) {
    return NextResponse.json({ error: "Place not found" }, { status: 404 });
  }

  const { data: rows, error: ppErr } = await supabase
    .from("poem_places")
    .select("poems(id,title,author,dynasty,dynasty_id,content)")
    .eq("place_id", id);

  if (ppErr) {
    return NextResponse.json({ error: ppErr.message }, { status: 500 });
  }

  const poems = (rows ?? [])
    .map((r: any) => r.poems)
    .filter(Boolean);

  return NextResponse.json({ place, poems });
}
