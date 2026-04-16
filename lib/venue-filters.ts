import type { Venue } from "@/types/venue";

export type SortOption = "distance" | "top_rated" | "newest";

export type FilterVenueType =
  | "Sauna"
  | "Cold Plunge"
  | "Ice Bath"
  | "Steam Room"
  | "Infrared Sauna"
  | "Wild Swimming"
  | "Outdoor Pool";

export type AmenityFilterId =
  | "parking"
  | "changing"
  | "towels"
  | "cafe"
  | "accessible"
  | "private"
  | "outdoor"
  | "showers";

export const AMENITY_FILTER_DEFS: {
  id: AmenityFilterId;
  label: string;
}[] = [
  { id: "parking", label: "Parking" },
  { id: "changing", label: "Changing Rooms" },
  { id: "towels", label: "Towels Provided" },
  { id: "cafe", label: "Café Nearby" },
  { id: "accessible", label: "Accessible" },
  { id: "private", label: "Private Hire" },
  { id: "outdoor", label: "Outdoor Area" },
  { id: "showers", label: "Showers" },
];

const AMENITY_KEYWORDS: Record<AmenityFilterId, string[]> = {
  parking: ["park", "parking"],
  changing: ["chang", "locker", "lockers"],
  towels: ["towel"],
  cafe: ["café", "cafe", "coffee"],
  accessible: ["access", "wheelchair", "accessible"],
  private: ["private", "hire", "exclusive"],
  outdoor: ["outdoor", "garden", "wild"],
  showers: ["shower"],
};

function amenityMatches(venue: Venue, id: AmenityFilterId): boolean {
  const hay = [...(venue.amenities ?? []), venue.description ?? ""]
    .join(" ")
    .toLowerCase();
  return AMENITY_KEYWORDS[id].some((k) => hay.includes(k));
}

function typeMatchesFilter(
  venue: Venue,
  t: FilterVenueType,
): boolean {
  const tags = (venue.types ?? []).map((x) => x.toLowerCase());
  const blob = [
    venue.name,
    venue.description,
    ...(venue.types ?? []),
  ]
    .join(" ")
    .toLowerCase();

  const checks: Record<FilterVenueType, () => boolean> = {
    Sauna: () =>
      tags.some((x) => x.includes("sauna")) || blob.includes("sauna"),
    "Cold Plunge": () =>
      tags.some((x) => x.includes("plunge") || x.includes("cold")) ||
      blob.includes("cold plunge"),
    "Ice Bath": () =>
      tags.some((x) => x.includes("ice")) || blob.includes("ice bath"),
    "Steam Room": () =>
      tags.some((x) => x.includes("steam")) || blob.includes("steam"),
    "Infrared Sauna": () =>
      tags.some((x) => x.includes("infrared")) || blob.includes("infrared"),
    "Wild Swimming": () =>
      tags.some((x) => x.includes("swim") || x.includes("wild")) ||
      blob.includes("wild swim"),
    "Outdoor Pool": () =>
      tags.some((x) => x.includes("pool") || x.includes("outdoor")) ||
      blob.includes("outdoor pool"),
  };

  return checks[t]();
}

export function venueMatchesFilterTypes(
  venue: Venue,
  selected: Set<FilterVenueType>,
): boolean {
  if (selected.size === 0) return true;
  return [...selected].some((t) => typeMatchesFilter(venue, t));
}

export function venueMatchesAmenities(
  venue: Venue,
  selected: Set<AmenityFilterId>,
): boolean {
  if (selected.size === 0) return true;
  return [...selected].every((id) => amenityMatches(venue, id));
}

/** null = unknown */
export function isVenueOpenNow(venue: Venue): boolean | null {
  const h = venue.opening_hours;
  if (h == null) return null;
  if (typeof h === "object" && h !== null && !Array.isArray(h)) {
    const o = h as Record<string, unknown>;
    if (typeof o.open_now === "boolean") return o.open_now;
  }
  return null;
}

export type FilterDraft = {
  sortBy: SortOption;
  maxDistanceMiles: number;
  minRating: number;
  venueTypes: Set<FilterVenueType>;
  amenities: Set<AmenityFilterId>;
  openNow: boolean;
};

export function defaultFilterDraft(): FilterDraft {
  return {
    sortBy: "distance",
    maxDistanceMiles: 25,
    minRating: 0,
    venueTypes: new Set(),
    amenities: new Set(),
    openNow: false,
  };
}

export function cloneFilterDraft(d: FilterDraft): FilterDraft {
  return {
    ...d,
    venueTypes: new Set(d.venueTypes),
    amenities: new Set(d.amenities),
  };
}
