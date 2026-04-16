import { distanceMiles } from "@/lib/geo";
import type { Venue } from "@/types/venue";
import type { UserLocation } from "@/types/location";
import {
  isVenueOpenNow,
  type FilterDraft,
  venueMatchesAmenities,
  venueMatchesFilterTypes,
} from "@/lib/venue-filters";

type Category =
  | "All"
  | "Sauna"
  | "Cold Plunge"
  | "Ice Bath"
  | "Steam Room"
  | "Infrared"
  | "Wild Swimming";

function venueMatchesCategory(venue: Venue, category: Category): boolean {
  if (category === "All") return true;
  const tags = (venue.types ?? []).map((t) => t.toLowerCase());
  const blob = [
    venue.name,
    venue.description,
    ...(venue.types ?? []),
    ...(venue.amenities ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const rules: Record<string, (t: string[], b: string) => boolean> = {
    Sauna: (t, b) =>
      t.some((x) => x.includes("sauna")) || b.includes("sauna"),
    "Cold Plunge": (t, b) =>
      t.some((x) => x.includes("plunge") || x.includes("cold plunge")) ||
      b.includes("cold plunge"),
    "Ice Bath": (t, b) =>
      t.some((x) => x.includes("ice")) || b.includes("ice bath"),
    "Steam Room": (t, b) =>
      t.some((x) => x.includes("steam")) || b.includes("steam"),
    Infrared: (t, b) =>
      t.some((x) => x.includes("infrared")) || b.includes("infrared"),
    "Wild Swimming": (t, b) =>
      t.some((x) => x.includes("swim") || x.includes("wild")) ||
      b.includes("wild swim") ||
      b.includes("open water"),
  };

  const fn = rules[category];
  return fn
    ? fn(tags, blob)
    : tags.some((x) => x.includes(category.toLowerCase()));
}

export function applyHomeFilters(
  venues: Venue[],
  category: Category,
  userLoc: UserLocation | null | undefined,
  f: FilterDraft,
): Venue[] {
  let list = venues.filter((v) => venueMatchesCategory(v, category));

  if (f.venueTypes.size > 0) {
    list = list.filter((v) => venueMatchesFilterTypes(v, f.venueTypes));
  }

  if (userLoc) {
    list = list.filter((v) => {
      if (v.latitude == null || v.longitude == null) return true;
      return (
        distanceMiles(
          userLoc.lat,
          userLoc.lng,
          v.latitude,
          v.longitude,
        ) <= f.maxDistanceMiles
      );
    });
  }

  if (f.minRating > 0) {
    list = list.filter(
      (v) => (v.google_rating ?? 0) >= f.minRating,
    );
  }

  list = list.filter((v) => venueMatchesAmenities(v, f.amenities));

  if (f.openNow) {
    list = list.filter((v) => {
      const o = isVenueOpenNow(v);
      return o !== false;
    });
  }

  const sorted = [...list];
  if (f.sortBy === "top_rated") {
    sorted.sort((a, b) => {
      const ra = a.google_rating ?? 0;
      const rb = b.google_rating ?? 0;
      return rb - ra;
    });
  } else if (f.sortBy === "newest") {
    sorted.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  } else if (f.sortBy === "distance" && userLoc) {
    sorted.sort((a, b) => {
      const da =
        a.latitude != null && a.longitude != null
          ? distanceMiles(
              userLoc.lat,
              userLoc.lng,
              a.latitude,
              a.longitude,
            )
          : Infinity;
      const db =
        b.latitude != null && b.longitude != null
          ? distanceMiles(
              userLoc.lat,
              userLoc.lng,
              b.latitude,
              b.longitude,
            )
          : Infinity;
      return da - db;
    });
  }

  return sorted;
}
