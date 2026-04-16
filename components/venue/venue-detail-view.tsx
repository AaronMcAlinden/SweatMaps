"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Banknote,
  Bath,
  Bookmark,
  Car,
  Check,
  Clock,
  Coffee,
  Dumbbell,
  MapPin,
  Share2,
  Sparkles,
  Thermometer,
  Trees,
  Users,
  Wifi,
  Wind,
  Lock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Venue } from "@/types/venue";
import type { VisitorSummaryPayload } from "@/types/visitor-summary";

function formatGbp(n: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(n);
}

function mapsUrl(venue: Venue): string {
  if (venue.latitude != null && venue.longitude != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${venue.latitude},${venue.longitude}`;
  }
  const q = [venue.address, venue.city, venue.country].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q || venue.name)}`;
}

function bookUrl(venue: Venue): string | null {
  if (venue.website?.startsWith("http")) return venue.website;
  if (venue.phone) return `tel:${venue.phone.replace(/\s/g, "")}`;
  return null;
}

function openingSummary(venue: Venue): { line: string; sub?: string } {
  const h = venue.opening_hours;
  if (h == null) {
    return { line: "Hours not listed", sub: "Contact the venue to confirm." };
  }
  if (typeof h === "string") {
    return { line: "Opening hours", sub: h };
  }
  if (typeof h === "object" && !Array.isArray(h)) {
    const o = h as Record<string, unknown>;
    const today = new Intl.DateTimeFormat("en", { weekday: "long" }).format(
      new Date(),
    );
    const key = Object.keys(o).find(
      (k) => k.toLowerCase() === today.toLowerCase(),
    );
    const val = key ? o[key] : null;
    if (typeof val === "string") {
      return { line: `Open · ${today}`, sub: val };
    }
    const lines = Object.entries(o)
      .slice(0, 4)
      .map(([k, v]) => `${k}: ${String(v)}`)
      .join(" · ");
    return {
      line: "Weekly hours",
      sub: lines || "See venue for details",
    };
  }
  return { line: "Opening hours", sub: String(h) };
}

function amenityIcon(label: string): LucideIcon {
  const n = label.toLowerCase();
  if (n.includes("park")) return Car;
  if (n.includes("wifi") || n.includes("wi-fi")) return Wifi;
  if (n.includes("locker")) return Lock;
  if (n.includes("shower")) return Bath;
  if (n.includes("towel")) return Wind;
  if (n.includes("café") || n.includes("cafe") || n.includes("coffee"))
    return Coffee;
  if (n.includes("gym") || n.includes("fitness")) return Dumbbell;
  if (n.includes("outdoor") || n.includes("garden")) return Trees;
  return Sparkles;
}

const BAR_HEIGHTS = [40, 55, 35, 70, 45, 90, 50, 65, 38, 72, 48, 80];

export function VenueDetailView({
  venue,
  visitorSummary,
}: {
  venue: Venue;
  visitorSummary: VisitorSummaryPayload | null;
}) {
  const photos = venue.photo_urls?.filter(Boolean) ?? [];
  const hero = photos[0] ?? null;
  const gallery = photos;
  const opening = openingSummary(venue);
  const book = bookUrl(venue);
  const maps = mapsUrl(venue);

  const claimMailto = `mailto:hello@sweatmaps.co?subject=${encodeURIComponent(
    `Claim listing: ${venue.name} (${venue.slug})`,
  )}`;

  async function onShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({ title: venue.name, url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      /* user cancelled or clipboard denied */
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col bg-background pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))]">
      <section className="relative w-full overflow-hidden bg-muted">
        <div className="relative aspect-[5/4] w-full sm:aspect-[4/3]">
          {hero ? (
            <Image
              src={hero}
              alt={venue.name}
              fill
              priority
              className="object-cover"
              sizes="430px"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[color-mix(in_oklab,var(--muted)_70%,var(--foreground))] font-serif text-lg text-primary-foreground/80">
              {venue.name}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />

          <div className="absolute left-0 right-0 top-0 flex items-start justify-between p-4 pt-[calc(0.75rem+env(safe-area-inset-top,0px))]">
            <Link
              href="/"
              className="flex size-11 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md transition hover:bg-black/45"
              aria-label="Back"
            >
              <ArrowLeft className="size-5" strokeWidth={2} />
            </Link>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onShare}
                className="flex size-11 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md transition hover:bg-black/45"
                aria-label="Share"
              >
                <Share2 className="size-[1.125rem]" strokeWidth={2} />
              </button>
              <button
                type="button"
                className="flex size-11 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md transition hover:bg-black/45"
                aria-label="Save"
              >
                <Bookmark className="size-5" strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
        {/* inverted curve feel: content pulls up with radius */}
        <div className="relative -mt-4 rounded-t-[1.75rem] bg-background px-5 pb-2 pt-6 shadow-[0_-8px_32px_rgba(27,48,34,0.06)]">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(venue.types?.length ? venue.types : ["Venue"]).map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-muted px-3 py-1 font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-foreground"
                >
                  {t}
                </span>
              ))}
            </div>

            <h1 className="font-serif text-[1.75rem] font-semibold leading-[1.15] tracking-tight text-foreground">
              {venue.name}
            </h1>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {venue.google_rating != null ? (
                <span className="inline-flex items-center gap-1.5 font-sans text-sm font-semibold text-star">
                  <span aria-hidden>★</span>
                  {venue.google_rating.toFixed(1)}
                  {venue.google_review_count != null ? (
                    <span className="font-normal text-muted-foreground">
                      ({venue.google_review_count} reviews)
                    </span>
                  ) : null}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">
                  No rating yet
                </span>
              )}
              {venue.is_verified ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 font-sans text-[0.6875rem] font-semibold uppercase tracking-wide text-foreground">
                  <Check className="size-3.5 text-primary" strokeWidth={3} />
                  Verified venue
                </span>
              ) : null}
            </div>

            <div className="space-y-2 font-sans text-sm">
              <p className="flex items-start gap-2 text-foreground">
                <Clock
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  strokeWidth={2}
                />
                <span>
                  <span className="font-medium">{opening.line}</span>
                  {opening.sub ? (
                    <span className="block text-muted-foreground">
                      {opening.sub}
                    </span>
                  ) : null}
                </span>
              </p>
              {(venue.address || venue.city) && (
                <p className="flex items-start gap-2 text-muted-foreground">
                  <MapPin
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                    strokeWidth={2}
                  />
                  <span>
                    {[venue.address, venue.city, venue.country]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="space-y-10 px-5 pt-8">
        <section aria-labelledby="quick-stats">
          <h2 id="quick-stats" className="sr-only">
            Quick stats
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={Thermometer}
              label="Temp"
              value={venue.temperature ?? "—"}
            />
            <StatCard
              icon={Users}
              label="Max cap"
              value={
                venue.max_capacity != null ? String(venue.max_capacity) : "—"
              }
            />
            <StatCard
              icon={Clock}
              label="Session"
              value={venue.session_length ?? "—"}
            />
            <StatCard
              icon={Banknote}
              label="From"
              value={
                venue.price_from != null
                  ? formatGbp(venue.price_from)
                  : "—"
              }
            />
          </div>
        </section>

        {venue.description ? (
          <section aria-labelledby="about" className="space-y-2">
            <p className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              About the experience
            </p>
            <p
              id="about"
              className="font-sans text-sm leading-relaxed text-foreground"
            >
              {venue.description}
            </p>
          </section>
        ) : null}

        <section aria-labelledby="popular-times" className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="popular-times"
              className="font-serif text-xl font-semibold tracking-tight text-foreground"
            >
              Popular Times
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] px-2 py-0.5 font-sans text-[0.625rem] font-semibold uppercase tracking-wider text-primary">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Live
            </span>
          </div>
          <p className="font-sans text-sm text-muted-foreground">
            Less busy than usual right now (sample data).
          </p>
          <div className="flex h-32 items-end justify-between gap-1 rounded-2xl border border-border bg-card px-2 pb-3 pt-4">
            {BAR_HEIGHTS.map((h, i) => (
              <div
                key={i}
                className={cn(
                  "w-full max-w-[1.35rem] rounded-t-md bg-[color-mix(in_oklab,var(--primary)_18%,transparent)]",
                  i === 7 && "bg-primary/80",
                )}
                style={{ height: `${(h / 100) * 7}rem` }}
              />
            ))}
          </div>
          <p className="font-sans text-[0.6875rem] text-muted-foreground">
            Popular times are indicative and update as more visits are logged.
          </p>
        </section>

        <section
          aria-labelledby="visitor-summary"
          className="rounded-2xl border border-border bg-card p-4 shadow-sm"
        >
          <div className="flex items-center gap-2.5">
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10"
              aria-hidden
            >
              <Sparkles className="size-4 text-primary" strokeWidth={2} />
            </span>
            <h2
              id="visitor-summary"
              className="font-serif text-lg font-semibold text-foreground"
            >
              What visitors say
            </h2>
          </div>
          {visitorSummary ? (
            <div className="mt-4 space-y-4">
              <p className="font-sans text-sm italic leading-relaxed text-muted-foreground">
                {visitorSummary.summary}
              </p>
              <div className="grid grid-cols-2 gap-4 border-t border-border/70 pt-4">
                <div>
                  <h3 className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-foreground">
                    Visitors love
                  </h3>
                  <ul className="mt-2 list-disc space-y-1.5 pl-4 font-sans text-[0.8125rem] leading-snug text-emerald-800">
                    {visitorSummary.pros.map((p, i) => (
                      <li key={`pro-${i}`}>{p}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-foreground">
                    Worth knowing
                  </h3>
                  <ul className="mt-2 list-disc space-y-1.5 pl-4 font-sans text-[0.8125rem] leading-snug text-rose-900/85">
                    {visitorSummary.cons.map((c, i) => (
                      <li key={`con-${i}`}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-3 font-sans text-sm leading-relaxed text-muted-foreground">
              Reviews coming soon for this venue.
            </p>
          )}
        </section>

        {venue.amenities?.length ? (
          <section aria-labelledby="amenities" className="space-y-3">
            <h2
              id="amenities"
              className="font-serif text-xl font-semibold tracking-tight text-foreground"
            >
              Amenities
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {venue.amenities.map((a) => {
                const Icon = amenityIcon(a);
                return (
                  <div
                    key={a}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-3 shadow-sm"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-primary">
                      <Icon className="size-5" strokeWidth={2} />
                    </span>
                    <span className="font-sans text-sm font-medium leading-snug text-foreground">
                      {a}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {gallery.length > 0 ? (
          <section aria-labelledby="gallery" className="space-y-3">
            <h2
              id="gallery"
              className="font-serif text-xl font-semibold tracking-tight text-foreground"
            >
              Photos
            </h2>
            <div className="scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
              {gallery.map((src, i) => (
                <div
                  key={`${src}-${i}`}
                  className="relative h-28 w-40 shrink-0 overflow-hidden rounded-xl bg-muted"
                >
                  <Image
                    src={src}
                    alt={`${venue.name} photo ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="160px"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section aria-labelledby="pricing" className="space-y-3">
          <h2
            id="pricing"
            className="font-serif text-xl font-semibold tracking-tight text-foreground"
          >
            Sessions &amp; pricing
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-4 shadow-sm">
              <div>
                <p className="font-sans text-sm font-semibold text-foreground">
                  Standard session
                </p>
                <p className="mt-0.5 font-sans text-xs uppercase tracking-wide text-muted-foreground">
                  {venue.session_length
                    ? `${venue.session_length} access`
                    : "Typical visit"}
                </p>
              </div>
              <p className="shrink-0 font-sans text-base font-semibold text-foreground">
                {venue.price_from != null
                  ? `From ${formatGbp(venue.price_from)}`
                  : "Ask"}
              </p>
            </div>
            <div className="rounded-2xl bg-primary px-4 py-4 text-primary-foreground shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-sans text-sm font-semibold">
                    Membership / bundles
                  </p>
                  <p className="mt-0.5 font-sans text-xs opacity-90">
                    Ask the venue for passes and peak pricing.
                  </p>
                </div>
                <span className="font-sans text-sm font-semibold opacity-90">
                  Enquire
                </span>
              </div>
            </div>
          </div>
        </section>

        <a
          href={claimMailto}
          className="flex w-full items-center justify-center rounded-2xl border border-border bg-transparent py-3.5 font-sans text-sm font-semibold text-foreground transition hover:bg-muted"
        >
          Claim this listing
        </a>
      </div>

      <div className="fixed bottom-0 left-1/2 z-40 flex w-full max-w-[430px] -translate-x-1/2 gap-2.5 border-t border-border bg-[color-mix(in_oklab,var(--background)_94%,transparent)] px-4 py-3 backdrop-blur-lg pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] shadow-[0_-8px_32px_rgba(27,48,34,0.08)]">
        <a
          href={maps}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-secondary py-3.5 font-sans text-sm font-semibold text-foreground transition hover:bg-[color-mix(in_oklab,var(--secondary)_90%,var(--foreground))]"
        >
          Get directions
        </a>
        {book ? (
          <a
            href={book}
            className="flex flex-[1.1] items-center justify-center rounded-2xl bg-primary py-3.5 font-sans text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-95"
            {...(book.startsWith("http")
              ? { target: "_blank" as const, rel: "noopener noreferrer" }
              : {})}
          >
            Book now
          </a>
        ) : (
          <span
            className="flex flex-[1.1] cursor-not-allowed items-center justify-center rounded-2xl bg-primary/35 py-3.5 font-sans text-sm font-semibold text-primary-foreground/90"
            title="No website or phone on file"
          >
            Book now
          </span>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <Icon
        className="mb-3 size-5 text-primary"
        strokeWidth={2}
        aria-hidden
      />
      <p className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-sans text-lg font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}
