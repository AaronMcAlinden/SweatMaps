"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin, Navigation, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { UserLocation } from "@/types/location";

const RECENT_KEY = "sweatmaps-recent-locations";

const SEED_RECENT: UserLocation[] = [
  { label: "Dublin, Ireland", lat: 53.3498, lng: -6.2603 },
  { label: "London, United Kingdom", lat: 51.5074, lng: -0.1278 },
  { label: "Edinburgh, United Kingdom", lat: 55.9533, lng: -3.1883 },
];

function loadRecent(): UserLocation[] {
  if (typeof window === "undefined") return SEED_RECENT;
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return SEED_RECENT;
    const parsed = JSON.parse(raw) as UserLocation[];
    if (!Array.isArray(parsed) || parsed.length === 0) return SEED_RECENT;
    return parsed.slice(0, 6);
  } catch {
    return SEED_RECENT;
  }
}

function saveRecent(loc: UserLocation) {
  const prev = loadRecent().filter(
    (x) =>
      x.label.toLowerCase() !== loc.label.toLowerCase() &&
      (Math.abs(x.lat - loc.lat) > 0.01 || Math.abs(x.lng - loc.lng) > 0.01),
  );
  const next = [loc, ...prev].slice(0, 6);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

type Prediction = { description: string; place_id: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (loc: UserLocation) => void;
  currentLocation: UserLocation | null;
};

export function LocationSheet({
  open,
  onOpenChange,
  onSelect,
  currentLocation,
}: Props) {
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [geoLabel, setGeoLabel] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [recent, setRecent] = useState<UserLocation[]>(SEED_RECENT);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setPredictions([]);
      setRecent(loadRecent());
    }
  }, [open]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setPredictions([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/places/autocomplete?input=${encodeURIComponent(query.trim())}`,
        );
        const data = (await res.json()) as {
          predictions?: Prediction[];
        };
        setPredictions(data.predictions ?? []);
      } catch {
        setPredictions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const pickPlace = useCallback(
    async (placeId: string, label: string) => {
      try {
        const res = await fetch(
          `/api/places/details?place_id=${encodeURIComponent(placeId)}`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as {
          lat: number;
          lng: number;
          label?: string;
        };
        const loc: UserLocation = {
          label: data.label ?? label,
          lat: data.lat,
          lng: data.lng,
        };
        saveRecent(loc);
        setRecent(loadRecent());
        onSelect(loc);
        onOpenChange(false);
      } catch {
        /* no-op */
      }
    },
    [onOpenChange, onSelect],
  );

  const useCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `/api/places/reverse?lat=${latitude}&lng=${longitude}`,
          );
          if (!res.ok) {
            const loc: UserLocation = {
              label: "Current location",
              lat: latitude,
              lng: longitude,
            };
            saveRecent(loc);
            onSelect(loc);
            onOpenChange(false);
            setGeoLoading(false);
            return;
          }
          const data = (await res.json()) as { label: string };
          setGeoLabel(data.label);
          const loc: UserLocation = {
            label: data.label,
            lat: latitude,
            lng: longitude,
          };
          saveRecent(loc);
          onSelect(loc);
          onOpenChange(false);
        } catch {
          const loc: UserLocation = {
            label: "Current location",
            lat: latitude,
            lng: longitude,
          };
          saveRecent(loc);
          onSelect(loc);
          onOpenChange(false);
        } finally {
          setGeoLoading(false);
        }
      },
      () => setGeoLoading(false),
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }, [onOpenChange, onSelect]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex justify-center",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        className={cn(
          "absolute inset-0 bg-black/45 backdrop-blur-[2px] transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
        aria-label="Close"
        onClick={() => onOpenChange(false)}
      />
      <div
        className={cn(
          "absolute bottom-0 left-1/2 flex max-h-[min(92dvh,640px)] w-full max-w-[430px] -translate-x-1/2 flex-col rounded-t-[2rem] bg-[#f8f7f2] shadow-[0_-8px_40px_rgba(0,0,0,0.18)] transition-transform duration-300 ease-out",
          open ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="flex justify-center pt-3 pb-2">
          <span className="h-1 w-10 rounded-full bg-border" />
        </div>

        <div className="flex items-start justify-between gap-3 px-6 pb-2 pt-1">
          <h2 className="font-serif text-xl font-semibold text-primary">
            Choose your location
          </h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground transition hover:bg-secondary"
            aria-label="Close"
          >
            <X className="size-5" strokeWidth={2} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 pb-8 pt-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-[1.125rem] -translate-y-1/2 text-muted-foreground"
              strokeWidth={2}
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter a city, town or postcode"
              className="w-full rounded-xl border border-transparent bg-[#e5e2db] py-3 pl-11 pr-4 font-sans text-[0.9375rem] text-foreground placeholder:text-muted-foreground focus:border-primary/20 focus:outline-none focus:ring-2 focus:ring-primary/15"
              autoFocus={open}
            />
            {loading ? (
              <p className="mt-2 font-sans text-xs text-muted-foreground">
                Searching…
              </p>
            ) : null}
            {predictions.length > 0 ? (
              <ul className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-border bg-card py-1 shadow-sm">
                {predictions.map((p) => (
                  <li key={p.place_id}>
                    <button
                      type="button"
                      className="w-full px-3 py-2.5 text-left font-sans text-sm text-foreground transition hover:bg-muted"
                      onClick={() => pickPlace(p.place_id, p.description)}
                    >
                      {p.description}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={geoLoading}
            className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card px-3 py-3 text-left transition hover:bg-muted disabled:opacity-60"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Navigation className="size-5" strokeWidth={2} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-sans text-sm font-semibold text-primary">
                Current location
              </span>
              <span className="mt-0.5 block truncate font-sans text-xs text-muted-foreground">
                {geoLabel ??
                  currentLocation?.label ??
                  "Use device location"}
              </span>
            </span>
            <span className="text-muted-foreground">›</span>
          </button>

          <div>
            <p className="mb-3 font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Recent locations
            </p>
            <ul className="space-y-2">
              {recent.map((r) => (
                <li key={`${r.label}-${r.lat}`}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(r);
                      saveRecent(r);
                      setRecent(loadRecent());
                      onOpenChange(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl py-2 text-left transition hover:bg-muted/80"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <MapPin
                        className="size-[1.125rem] text-primary"
                        strokeWidth={2}
                      />
                    </span>
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block font-sans text-sm font-semibold text-primary">
                        {r.label.split(",")[0]?.trim() ?? r.label}
                      </span>
                      <span className="block truncate font-sans text-xs text-muted-foreground">
                        {r.label.includes(",")
                          ? r.label.split(",").slice(1).join(",").trim()
                          : ""}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
