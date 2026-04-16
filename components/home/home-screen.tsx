"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  type ComponentType,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Bookmark,
  ChevronRight,
  Compass,
  Flame,
  Map as MapIcon,
  MapPin,
  Search,
  SlidersHorizontal,
  Snowflake,
  User,
} from "lucide-react";

import { FilterSheet } from "@/components/home/filter-sheet";
import { LocationSheet } from "@/components/home/location-sheet";
import { applyHomeFilters } from "@/lib/apply-home-filters";
import { pickFeaturedHeroVenue } from "@/lib/featured-hero";
import { distanceMiles } from "@/lib/geo";
import { cn } from "@/lib/utils";
import {
  cloneFilterDraft,
  defaultFilterDraft,
  isVenueOpenNow,
  type FilterDraft,
} from "@/lib/venue-filters";
import type { UserLocation } from "@/types/location";
import type { Venue } from "@/types/venue";

const CATEGORIES = [
  "All",
  "Sauna",
  "Cold Plunge",
  "Ice Bath",
  "Steam Room",
  "Infrared",
  "Wild Swimming",
] as const;

type Category = (typeof CATEGORIES)[number];

const DEFAULT_LOCATION: UserLocation = {
  label: "Belfast, Northern Ireland",
  lat: 54.5973,
  lng: -5.9301,
};

const USER_LOC_KEY = "sweatmaps-user-location";

function pickPrimaryImage(venue: Venue): string | null {
  const url = venue.photo_urls?.[0];
  return url && url.length > 0 ? url : null;
}

function formatLocation(venue: Venue): string {
  const parts = [venue.city, venue.country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "Location TBC";
}

function formatAreaLine(venue: Venue): string {
  if (venue.address) {
    const segment = venue.address.split(",").map((s) => s.trim())[0];
    if (segment) return segment;
  }
  return venue.city ?? "";
}

function formatPrice(venue: Venue): string | null {
  if (venue.price_from == null) return null;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(venue.price_from);
}

function formatTypesCaps(venue: Venue): string {
  const raw = (venue.types ?? []).filter(Boolean);
  if (raw.length === 0) return "WELLNESS";
  return raw
    .slice(0, 3)
    .map((t) => t.toUpperCase())
    .join(" • ");
}

function hiddenGemCategory(venue: Venue): string {
  const t = venue.types?.[0];
  if (!t) return "COASTAL RETREAT";
  return t.replace(/-/g, " ").toUpperCase();
}

function formatDistanceMi(venue: Venue, user: UserLocation): string {
  if (venue.latitude == null || venue.longitude == null) {
    return "—";
  }
  const d = distanceMiles(
    user.lat,
    user.lng,
    venue.latitude,
    venue.longitude,
  );
  return d.toFixed(1);
}

function openStatusLabel(venue: Venue): string {
  const o = isVenueOpenNow(venue);
  if (o === true) return "Open";
  if (o === false) return "Closed";
  return "Hours unknown";
}

export function HomeScreen({ venues }: { venues: Venue[] }) {
  const pathname = usePathname();
  const [category, setCategory] = useState<Category>("All");
  const [userLocation, setUserLocation] = useState<UserLocation>(
    DEFAULT_LOCATION,
  );
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [appliedFilter, setAppliedFilter] = useState<FilterDraft>(() =>
    defaultFilterDraft(),
  );
  const [filterDraft, setFilterDraft] = useState<FilterDraft>(() =>
    defaultFilterDraft(),
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(USER_LOC_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as UserLocation;
        if (
          parsed?.label &&
          typeof parsed.lat === "number" &&
          typeof parsed.lng === "number"
        ) {
          queueMicrotask(() => setUserLocation(parsed));
        }
      }
    } catch {
      /* keep default */
    }
  }, []);

  const persistLocation = useCallback((loc: UserLocation) => {
    localStorage.setItem(USER_LOC_KEY, JSON.stringify(loc));
    setUserLocation(loc);
  }, []);

  const openFilterSheet = useCallback(() => {
    setFilterDraft(cloneFilterDraft(appliedFilter));
    setFilterSheetOpen(true);
  }, [appliedFilter]);

  const filtered = useMemo(
    () => applyHomeFilters(venues, category, userLocation, appliedFilter),
    [venues, category, userLocation, appliedFilter],
  );

  const filterPreviewCount = useMemo(
    () => applyHomeFilters(venues, category, userLocation, filterDraft).length,
    [venues, category, userLocation, filterDraft],
  );

  const featuredHero = useMemo(
    () => pickFeaturedHeroVenue(filtered, userLocation),
    [filtered, userLocation],
  );

  const nearYou = useMemo(() => {
    const pool = filtered.filter((v) => v.id !== featuredHero?.id);
    return pool.slice(0, 12);
  }, [filtered, featuredHero?.id]);

  const hiddenGems = useMemo(() => {
    const ranked = filtered
      .filter((v) => !v.is_featured)
      .filter(
        (v) =>
          (v.google_rating ?? 0) >= 4.2 || (v.google_review_count ?? 0) > 5,
      );
    const pool =
      ranked.length > 0 ? ranked : filtered.filter((v) => !v.is_featured);
    return pool.slice(0, 10);
  }, [filtered]);

  const recentlyAdded = useMemo(() => {
    return [...filtered]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .slice(0, 6);
  }, [filtered]);

  return (
    <div className="relative flex min-h-dvh flex-col bg-background pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))]">
      <header className="sticky top-0 z-20 bg-background px-5 pb-2 pt-[calc(1rem+env(safe-area-inset-top,0px))]">
        <div className="flex items-center justify-between gap-3">
          <span className="font-serif text-[1.375rem] font-bold italic leading-none tracking-tight text-foreground">
            SweatMaps
          </span>
          <button
            type="button"
            onClick={() => setLocationSheetOpen(true)}
            className="flex size-10 items-center justify-center rounded-full text-foreground transition hover:bg-secondary"
            aria-label="Choose location"
          >
            <Search className="size-[1.25rem]" strokeWidth={1.75} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setLocationSheetOpen(true)}
          className="mt-4 flex w-full items-center gap-2.5 text-left transition-opacity hover:opacity-90"
        >
          <MapPin
            className="size-[1.125rem] shrink-0 text-primary"
            strokeWidth={2}
          />
          <span className="truncate font-sans text-[0.9375rem] font-medium text-foreground">
            {userLocation?.label ?? "Choose location"}
          </span>
        </button>

        <div className="mt-3 flex gap-2.5">
          <button
            type="button"
            onClick={() => setLocationSheetOpen(true)}
            className="relative min-w-0 flex-1 text-left"
          >
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-[1.125rem] -translate-y-1/2 text-muted-foreground"
              strokeWidth={2}
            />
            <span className="flex w-full cursor-pointer rounded-[0.875rem] border border-transparent bg-muted py-3 pl-11 pr-4 font-sans text-[0.9375rem] text-muted-foreground">
              Search saunas, cold plunges…
            </span>
          </button>
          <button
            type="button"
            onClick={openFilterSheet}
            className="flex size-[3.25rem] shrink-0 items-center justify-center rounded-[0.875rem] bg-primary text-primary-foreground shadow-sm transition hover:bg-[color-mix(in_oklab,var(--primary)_92%,black)]"
            aria-label="Filters"
          >
            <SlidersHorizontal className="size-[1.25rem]" strokeWidth={2} />
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-10 px-5 pt-6">
        <section aria-label="Categories">
          <div className="scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5 pb-0.5">
            {CATEGORIES.map((c) => {
              const active = c === category;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={cn(
                    "shrink-0 snap-start rounded-full px-[1.125rem] py-2.5 font-sans text-[0.8125rem] font-medium leading-none transition",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-foreground hover:bg-[color-mix(in_oklab,var(--muted)_88%,var(--foreground))]",
                  )}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </section>

        <section aria-label="Featured" className="space-y-0">
          {featuredHero ? (
            <Link
              href={`/venue/${featuredHero.slug}`}
              className="group relative block overflow-hidden bg-muted shadow-[0_8px_32px_rgba(27,48,34,0.12)] [border-radius:1.75rem_1.75rem_1.75rem_0.375rem]"
            >
              <div className="relative aspect-[4/5] w-full overflow-hidden">
                {pickPrimaryImage(featuredHero) ? (
                  <Image
                    src={pickPrimaryImage(featuredHero)!}
                    alt={featuredHero.name}
                    fill
                    className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
                    sizes="430px"
                    unoptimized
                    priority
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1b3022]/88 via-[#1b3022]/25 to-transparent" />

                <div className="absolute left-4 top-4 z-[1]">
                  <span className="inline-block rounded-md bg-black/45 px-3 py-1.5 font-sans text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-[2px]">
                    Featured
                  </span>
                </div>

                <span
                  className="pointer-events-none absolute right-4 top-4 z-[1] flex size-11 items-center justify-center rounded-full bg-white/25 text-primary backdrop-blur-md"
                  aria-hidden
                >
                  <Bookmark className="size-5" strokeWidth={2} />
                </span>

                <div className="absolute inset-x-0 bottom-0 z-[1] flex flex-col items-start gap-3 p-5 pb-6">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {featuredHero.is_featured ? (
                      <span className="rounded-full bg-peach px-3 py-1 font-sans text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-primary">
                        Premium Discovery
                      </span>
                    ) : null}
                    {featuredHero.google_rating != null ? (
                      <span className="flex items-center gap-1 font-sans text-sm font-medium text-white">
                        <span className="text-white">★</span>
                        {featuredHero.google_rating.toFixed(1)}
                      </span>
                    ) : null}
                  </div>
                  <h2 className="max-w-[18ch] font-serif text-[1.625rem] font-semibold leading-[1.15] tracking-tight text-white">
                    {featuredHero.name}
                  </h2>
                  <p className="font-sans text-[0.9375rem] leading-snug text-white/88">
                    {formatLocation(featuredHero)}
                  </p>
                </div>
              </div>
            </Link>
          ) : (
            <p className="rounded-2xl border border-dashed border-border bg-muted/50 px-4 py-10 text-center font-sans text-sm text-muted-foreground">
              No venues match this filter yet.
            </p>
          )}
        </section>

        <section aria-label="Near you" className="space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-serif text-xl font-semibold tracking-tight text-foreground">
              Near You
            </h2>
            <Link
              href="/"
              className="font-sans text-[0.8125rem] font-medium text-link underline underline-offset-4"
            >
              See all
            </Link>
          </div>
          {nearYou.length > 0 ? (
            <div className="scrollbar-none -mx-5 flex gap-3 overflow-x-auto px-5 pb-1">
              {nearYou.map((venue) => (
                <NearYouCard
                  key={venue.id}
                  venue={venue}
                  userLocation={userLocation}
                />
              ))}
            </div>
          ) : (
            <p className="font-sans text-sm text-muted-foreground">
              Nothing nearby for this filter — try All or another category.
            </p>
          )}
        </section>

        <section aria-label="Hidden gems" className="space-y-3">
          <div className="space-y-1">
            <h2 className="font-serif text-xl font-semibold tracking-tight text-foreground">
              Hidden Gems
            </h2>
            <p className="font-sans text-[0.9375rem] text-muted-foreground">
              Curated spots worth the detour
            </p>
          </div>
          {hiddenGems.length > 0 ? (
            <div className="scrollbar-none -mx-5 flex gap-3 overflow-x-auto px-5 pb-1">
              {hiddenGems.map((venue) => (
                <HiddenGemCard key={venue.id} venue={venue} />
              ))}
            </div>
          ) : (
            <p className="font-sans text-sm text-muted-foreground">
              We’ll surface standout spots here as the community grows.
            </p>
          )}
        </section>

        <section aria-label="Recently added" className="space-y-4 pb-4">
          <h2 className="font-serif text-xl font-semibold tracking-tight text-foreground">
            Recently Added
          </h2>
          {recentlyAdded.length > 0 ? (
            <ul className="divide-y divide-border/60">
              {recentlyAdded.map((venue) => (
                <li key={venue.id} className="py-3 first:pt-0">
                  <Link
                    href={`/venue/${venue.slug}`}
                    className="group flex items-center gap-3.5"
                  >
                    <div className="relative size-[4.5rem] shrink-0 overflow-hidden rounded-xl bg-muted">
                      {pickPrimaryImage(venue) ? (
                        <Image
                          src={pickPrimaryImage(venue)!}
                          alt={venue.name}
                          fill
                          className="object-cover transition group-hover:scale-[1.02]"
                          sizes="72px"
                          unoptimized
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-sans text-[0.9375rem] font-semibold leading-snug text-foreground">
                        {venue.name}
                      </p>
                      <p className="mt-1 font-sans text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                        {formatTypesCaps(venue)}
                      </p>
                    </div>
                    <ChevronRight
                      className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5"
                      strokeWidth={2}
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-sans text-sm text-muted-foreground">
              New venues will appear here.
            </p>
          )}
        </section>
      </div>

      <nav
        className="fixed bottom-0 left-1/2 z-30 flex w-full max-w-[430px] -translate-x-1/2 border-t border-border bg-background px-1 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] shadow-[0_-4px_24px_rgba(27,48,34,0.06)]"
        aria-label="Primary"
      >
        <NavItem
          href="/"
          label="Discover"
          icon={Compass}
          active={pathname === "/"}
        />
        <NavItem
          href="/map"
          label="Map"
          icon={MapIcon}
          active={pathname === "/map"}
        />
        <NavItem
          href="/saved"
          label="Saved"
          icon={Bookmark}
          active={pathname === "/saved"}
        />
        <NavItem
          href="/profile"
          label="Profile"
          icon={User}
          active={pathname === "/profile"}
        />
      </nav>

      <LocationSheet
        open={locationSheetOpen}
        onOpenChange={setLocationSheetOpen}
        onSelect={persistLocation}
        currentLocation={userLocation}
      />

      <FilterSheet
        open={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        venues={venues}
        filteredCount={filterPreviewCount}
        draft={filterDraft}
        onDraftChange={setFilterDraft}
        onReset={() => setFilterDraft(defaultFilterDraft())}
        onApply={() => setAppliedFilter(cloneFilterDraft(filterDraft))}
      />
    </div>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-1 flex-col items-center gap-1.5 py-1.5 font-sans text-[0.625rem] font-semibold uppercase tracking-[0.06em] transition",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "flex size-11 items-center justify-center rounded-full transition",
          active ? "bg-primary text-primary-foreground shadow-sm" : "bg-transparent",
        )}
      >
        <Icon className="size-[1.375rem]" strokeWidth={active ? 2.25 : 1.75} />
      </span>
      {label}
    </Link>
  );
}

function NearYouCard({
  venue,
  userLocation,
}: {
  venue: Venue;
  userLocation: UserLocation;
}) {
  const img = pickPrimaryImage(venue);
  const price = formatPrice(venue);
  const area = formatAreaLine(venue) || venue.city || "";
  const miles = formatDistanceMi(venue, userLocation);
  const status = openStatusLabel(venue);

  return (
    <Link
      href={`/venue/${venue.slug}`}
      className="w-[10rem] shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-card shadow-[0_2px_12px_rgba(27,48,34,0.07)] transition hover:shadow-[0_4px_16px_rgba(27,48,34,0.1)]"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-t-2xl bg-muted">
        {img ? (
          <Image
            src={img}
            alt={venue.name}
            fill
            className="object-cover"
            sizes="160px"
            unoptimized
          />
        ) : null}
      </div>
      <div className="space-y-1 px-2.5 pb-3 pt-2.5">
        <h3 className="font-serif text-[0.9375rem] font-bold leading-tight text-foreground">
          {venue.name}
        </h3>
        {area ? (
          <p className="font-sans text-[0.75rem] text-muted-foreground">
            {area}
          </p>
        ) : null}
        <p className="font-sans text-[0.6875rem] font-semibold tabular-nums text-foreground">
          {price ?? "—"} • {miles} miles
        </p>
        <p className="font-sans text-[0.625rem] italic text-muted-foreground">
          · {status}
        </p>
        <div className="flex flex-wrap gap-1 pt-0.5">
          {venue.has_hot ? (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/20 px-1.5 py-0.5 font-sans text-[0.5625rem] font-semibold uppercase tracking-wide text-amber-950">
              <Flame className="size-2.5" strokeWidth={2} />
              Hot
            </span>
          ) : null}
          {venue.has_cold ? (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-500/20 px-1.5 py-0.5 font-sans text-[0.5625rem] font-semibold uppercase tracking-wide text-sky-950">
              <Snowflake className="size-2.5" strokeWidth={2} />
              Cold
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function HiddenGemCard({ venue }: { venue: Venue }) {
  const img = pickPrimaryImage(venue);
  const rating =
    venue.google_rating != null ? venue.google_rating.toFixed(1) : "—";

  return (
    <Link
      href={`/venue/${venue.slug}`}
      className="w-[17.5rem] shrink-0 snap-start rounded-2xl border border-border bg-card p-2.5 shadow-[0_2px_14px_rgba(27,48,34,0.08)] transition hover:shadow-[0_4px_20px_rgba(27,48,34,0.1)]"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-muted">
        {img ? (
          <Image
            src={img}
            alt={venue.name}
            fill
            className="object-cover"
            sizes="280px"
            unoptimized
          />
        ) : null}
      </div>
      <div className="flex items-start gap-2 pt-3.5">
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-link">
            {hiddenGemCategory(venue)}
          </p>
          <h3 className="font-serif text-lg font-semibold leading-snug tracking-tight text-foreground">
            {venue.name}
          </h3>
        </div>
        <div className="mt-0.5 shrink-0 rounded-full bg-muted px-2.5 py-1 font-sans text-xs font-semibold tabular-nums text-foreground">
          <span className="text-star">★</span> {rating}
        </div>
      </div>
    </Link>
  );
}
