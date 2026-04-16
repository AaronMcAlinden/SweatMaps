"use client";

import { useMemo } from "react";
import {
  Bath,
  Car,
  Coffee,
  DoorOpen,
  Star,
  Trees,
  Umbrella,
  Users,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { Venue } from "@/types/venue";
import {
  AMENITY_FILTER_DEFS,
  type AmenityFilterId,
  type FilterDraft,
  type FilterVenueType,
} from "@/lib/venue-filters";

const VENUE_TYPES: FilterVenueType[] = [
  "Sauna",
  "Cold Plunge",
  "Ice Bath",
  "Steam Room",
  "Infrared Sauna",
  "Wild Swimming",
  "Outdoor Pool",
];

const AMENITY_ICONS: Record<AmenityFilterId, typeof Car> = {
  parking: Car,
  changing: DoorOpen,
  towels: Bath,
  cafe: Coffee,
  accessible: Users,
  private: Umbrella,
  outdoor: Trees,
  showers: Bath,
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venues: Venue[];
  filteredCount: number;
  draft: FilterDraft;
  onDraftChange: (d: FilterDraft) => void;
  onReset: () => void;
  onApply: () => void;
};

export function FilterSheet({
  open,
  onOpenChange,
  venues,
  filteredCount,
  draft,
  onDraftChange,
  onReset,
  onApply,
}: Props) {
  const distanceLabel = String(draft.maxDistanceMiles);

  const sortOptions = useMemo(
    () =>
      [
        { id: "distance" as const, label: "Distance" },
        { id: "top_rated" as const, label: "Top Rated" },
        { id: "newest" as const, label: "Newest" },
      ],
    [],
  );

  function toggleType(t: FilterVenueType) {
    const next = new Set(draft.venueTypes);
    if (next.has(t)) next.delete(t);
    else next.add(t);
    onDraftChange({ ...draft, venueTypes: next });
  }

  function toggleAmenity(id: AmenityFilterId) {
    const next = new Set(draft.amenities);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onDraftChange({ ...draft, amenities: next });
  }

  function setMinRating(n: number) {
    onDraftChange({
      ...draft,
      minRating: draft.minRating === n ? 0 : n,
    });
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-end justify-center transition-opacity duration-300",
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={() => onOpenChange(false)}
      />
      <div
        className={cn(
          "relative flex max-h-[min(94dvh,720px)] w-full max-w-[430px] flex-col rounded-t-[2rem] bg-[#fbf9f4] shadow-[0_-12px_48px_rgba(0,0,0,0.2)] transition-transform duration-300 ease-out",
          open ? "translate-y-0" : "translate-y-[110%]",
        )}
      >
        <div className="flex justify-center pt-3 pb-1">
          <span className="h-1 w-10 rounded-full bg-[#e5e2da]" />
        </div>

        <div className="flex items-center justify-between gap-2 px-5 pb-2 pt-1">
          <button
            type="button"
            onClick={onReset}
            className="font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground transition hover:text-foreground"
          >
            Reset
          </button>
          <h2 className="flex-1 text-center font-serif text-lg font-semibold text-primary">
            Filter &amp; Sort
          </h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex size-9 items-center justify-center rounded-full bg-muted text-foreground"
            aria-label="Close"
          >
            <X className="size-4" strokeWidth={2} />
          </button>
        </div>

        <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-5 pb-28">
          <section className="mb-6">
            <h3 className="mb-2 font-serif text-base font-semibold text-primary">
              Sort By
            </h3>
            <div className="flex rounded-xl bg-[#e5e2da] p-1">
              {sortOptions.map((o) => {
                const active = draft.sortBy === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => onDraftChange({ ...draft, sortBy: o.id })}
                    className={cn(
                      "flex-1 rounded-lg py-2.5 font-sans text-[0.8125rem] font-medium transition",
                      active
                        ? "bg-white text-primary shadow-sm"
                        : "text-primary/80 hover:text-primary",
                    )}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="mb-6">
            <h3 className="mb-2 font-serif text-base font-semibold text-primary">
              Venue Type
            </h3>
            <div className="flex flex-wrap gap-2">
              {VENUE_TYPES.map((t) => {
                const active = draft.venueTypes.has(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleType(t)}
                    className={cn(
                      "rounded-full px-3.5 py-2 font-sans text-[0.8125rem] font-medium transition",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-[#e5e2da] text-primary",
                    )}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="mb-6">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h3 className="font-serif text-base font-semibold text-primary">
                Distance
              </h3>
              <span className="font-serif text-sm italic text-primary">
                {distanceLabel}mi
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={25}
              step={1}
              value={draft.maxDistanceMiles}
              onChange={(e) => {
                const v = Number(e.target.value);
                onDraftChange({ ...draft, maxDistanceMiles: v });
              }}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[#e5e2da] accent-primary [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-white"
            />
            <div className="mt-1 flex justify-between font-sans text-[0.6875rem] font-medium uppercase tracking-wide text-muted-foreground">
              <span>0 MI</span>
              <span>25 MI</span>
            </div>
          </section>

          <section className="mb-6">
            <h3 className="mb-2 font-serif text-base font-semibold text-primary">
              Minimum Rating
            </h3>
            <div className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-3">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setMinRating(n)}
                    className="p-0.5"
                    aria-label={`Minimum ${n} stars`}
                  >
                    <Star
                      className={cn(
                        "size-6",
                        n <= draft.minRating
                          ? "fill-[#f8a182] text-[#f8a182]"
                          : "text-[#e5e2da]",
                      )}
                      strokeWidth={1.5}
                    />
                  </button>
                ))}
              </div>
              <span className="font-serif text-sm italic text-primary">
                {draft.minRating > 0
                  ? `${draft.minRating.toFixed(1)}+`
                  : "Any"}
              </span>
            </div>
          </section>

          <section className="mb-6">
            <h3 className="mb-2 font-serif text-base font-semibold text-primary">
              Amenities
            </h3>
            <div className="flex flex-wrap gap-2">
              {AMENITY_FILTER_DEFS.map(({ id, label }) => {
                const Icon = AMENITY_ICONS[id];
                const active = draft.amenities.has(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleAmenity(id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-2 font-sans text-[0.75rem] font-medium transition",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-transparent bg-[#e5e2da] text-primary",
                    )}
                  >
                    <Icon className="size-3.5 shrink-0" strokeWidth={2} />
                    {label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
            <span className="font-sans text-sm font-medium text-primary">
              Open Now
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={draft.openNow}
              onClick={() =>
                onDraftChange({ ...draft, openNow: !draft.openNow })
              }
              className={cn(
                "relative h-7 w-12 shrink-0 rounded-full transition-colors",
                draft.openNow ? "bg-primary" : "bg-[#e5e2da]",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 size-6 rounded-full bg-white shadow transition-transform",
                  draft.openNow ? "left-6" : "left-0.5",
                )}
              />
            </button>
          </section>

          <p className="pb-2 font-sans text-xs text-muted-foreground">
            {venues.length} venue{venues.length === 1 ? "" : "s"} in list
          </p>
        </div>

        <div className="absolute bottom-0 left-0 right-0 border-t border-border bg-[#fbf9f4] px-5 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-3">
          <button
            type="button"
            onClick={() => {
              onApply();
              onOpenChange(false);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-serif text-base font-semibold text-primary-foreground shadow-md transition hover:opacity-95"
          >
            Show {filteredCount} venue{filteredCount === 1 ? "" : "s"}
            <span aria-hidden>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
