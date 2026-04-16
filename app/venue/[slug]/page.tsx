import { notFound } from "next/navigation";

import { VenueDetailView } from "@/components/venue/venue-detail-view";
import { createSupabaseClient } from "@/lib/supabase";
import type { Venue } from "@/types/venue";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function VenuePage({ params }: Props) {
  const { slug } = await params;
  const supabase = createSupabaseClient();
  if (!supabase) {
    notFound();
  }

  const { data, error } = await supabase
    .from("venues")
    .select(
      [
        "id",
        "name",
        "slug",
        "types",
        "address",
        "city",
        "country",
        "latitude",
        "longitude",
        "description",
        "price_from",
        "session_length",
        "max_capacity",
        "temperature",
        "amenities",
        "phone",
        "website",
        "instagram",
        "google_place_id",
        "google_rating",
        "google_review_count",
        "photo_urls",
        "opening_hours",
        "is_verified",
        "is_featured",
        "is_claimed",
        "has_hot",
        "has_cold",
        "created_at",
        "updated_at",
      ].join(", "),
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const venue = data as unknown as Venue;

  return <VenueDetailView venue={venue} />;
}
