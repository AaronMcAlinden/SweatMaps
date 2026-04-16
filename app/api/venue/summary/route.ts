import { NextResponse } from "next/server";

import { createSupabaseClient } from "@/lib/supabase";
import { buildVisitorSummary } from "@/lib/visitor-summary";
import type { Venue } from "@/types/venue";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug")?.trim() ?? "";
  if (!slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }

  const supabase = createSupabaseClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured" },
      { status: 503 },
    );
  }

  const { data, error } = await supabase
    .from("venues")
    .select(
      [
        "id",
        "name",
        "slug",
        "google_place_id",
        "ai_summary",
        "ai_pros",
        "ai_cons",
        "ai_summary_generated_at",
      ].join(", "),
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Venue not found" }, { status: 404 });
  }

  const summary = await buildVisitorSummary(data as unknown as Venue);

  return NextResponse.json({ data: summary });
}
