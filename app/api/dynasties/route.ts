import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET() {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("dynasties")
    .select("id,name")
    .order("sort_order");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ dynasties: data ?? [] });
}
