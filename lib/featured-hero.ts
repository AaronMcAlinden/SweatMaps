import type { UserLocation } from "@/types/location";
import type { Venue } from "@/types/venue";

/** First segment before comma, compared case-insensitively to "belfast". */
export function userLocationCityIsBelfast(loc: UserLocation): boolean {
  const head = loc.label.split(",")[0]?.trim().toLowerCase() ?? "";
  return head === "belfast";
}

function hasPrimaryPhoto(venue: Venue): boolean {
  const url = venue.photo_urls?.[0];
  return typeof url === "string" && url.length > 0;
}

function qualityScore(venue: Venue): number {
  const rating = venue.google_rating ?? 0;
  const count = Math.max(1, venue.google_review_count ?? 0);
  return rating * 0.7 + Math.log(count) * 0.3;
}

function meetsNonBelfastStrictCriteria(venue: Venue): boolean {
  return (
    hasPrimaryPhoto(venue) &&
    (venue.google_rating ?? 0) >= 4 &&
    (venue.google_review_count ?? 0) >= 10
  );
}

function sortByQualityScoreDesc(venues: Venue[]): Venue[] {
  return [...venues].sort((a, b) => qualityScore(b) - qualityScore(a));
}

function sortFallbackByRatingDesc(venues: Venue[]): Venue[] {
  return [...venues].sort((a, b) => {
    const ra = a.google_rating ?? 0;
    const rb = b.google_rating ?? 0;
    if (rb !== ra) return rb - ra;
    return (b.google_review_count ?? 0) - (a.google_review_count ?? 0);
  });
}

/**
 * Prefer a candidate that is not the same venue as the first Near You slot
 * (`filtered[0]` in current sort order). Otherwise use the first candidate.
 */
function preferNotFirstNearYou(
  orderedCandidates: Venue[],
  firstNearYou: Venue | null,
): Venue | null {
  if (orderedCandidates.length === 0) return null;
  if (!firstNearYou) return orderedCandidates[0] ?? null;
  const alt = orderedCandidates.find((v) => v.id !== firstNearYou.id);
  return alt ?? orderedCandidates[0] ?? null;
}

function pickNonBelfastFeatured(
  filtered: Venue[],
  firstNearYou: Venue | null,
): Venue | null {
  const strict = filtered.filter(meetsNonBelfastStrictCriteria);
  const strictRanked = sortByQualityScoreDesc(strict);
  const fromStrict = preferNotFirstNearYou(strictRanked, firstNearYou);
  if (fromStrict) return fromStrict;

  const withPhoto = filtered.filter(hasPrimaryPhoto);
  const fallbackRanked = sortFallbackByRatingDesc(withPhoto);
  return preferNotFirstNearYou(fallbackRanked, firstNearYou);
}

function pickBelfastFeatured(
  filtered: Venue[],
  firstNearYou: Venue | null,
): Venue | null {
  const pool = filtered.filter((v) => Boolean(v.is_featured));
  if (pool.length === 0) {
    return filtered[0] ?? null;
  }
  return preferNotFirstNearYou(pool, firstNearYou);
}

/**
 * Location-aware featured hero for the home screen (same inputs as filtered
 * venue lists from Supabase).
 */
export function pickFeaturedHeroVenue(
  filtered: Venue[],
  userLocation: UserLocation,
): Venue | null {
  if (filtered.length === 0) return null;

  const firstNearYou = filtered[0] ?? null;

  if (userLocationCityIsBelfast(userLocation)) {
    return pickBelfastFeatured(filtered, firstNearYou);
  }

  const picked = pickNonBelfastFeatured(filtered, firstNearYou);
  return picked ?? filtered[0] ?? null;
}
