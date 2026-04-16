"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

import type { VisitorSummaryPayload } from "@/types/visitor-summary";

function SummarySkeleton() {
  return (
    <div className="mt-4 space-y-2.5" aria-hidden>
      <div className="h-3.5 w-full rounded-md bg-muted" />
      <div className="h-3.5 w-[92%] rounded-md bg-muted" />
      <div className="h-3.5 w-[78%] rounded-md bg-muted" />
    </div>
  );
}

type ApiResponse = { data: VisitorSummaryPayload | null };

export function VisitorSummarySection({ slug }: { slug: string }) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [payload, setPayload] = useState<VisitorSummaryPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();

    async function run() {
      setStatus("loading");
      setPayload(null);
      try {
        const res = await fetch(
          `/api/venue/summary?slug=${encodeURIComponent(slug)}`,
          { signal: ac.signal },
        );
        if (!res.ok) {
          if (!cancelled) setStatus("error");
          return;
        }
        const body = (await res.json()) as ApiResponse;
        if (cancelled) return;
        setPayload(body.data ?? null);
        setStatus("ready");
      } catch {
        if (ac.signal.aborted || cancelled) return;
        setStatus("error");
      }
    }

    void run();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [slug]);

  return (
    <section
      aria-labelledby="visitor-summary"
      className="rounded-2xl border border-border bg-card p-4 shadow-sm"
      aria-busy={status === "loading"}
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

      {status === "loading" ? (
        <SummarySkeleton />
      ) : status === "error" ? (
        <p className="mt-3 font-sans text-sm leading-relaxed text-muted-foreground">
          Could not load visitor insights. Try again later.
        </p>
      ) : payload ? (
        <div className="mt-4 space-y-4">
          <p className="font-sans text-sm italic leading-relaxed text-muted-foreground">
            {payload.summary}
          </p>
          <div className="grid grid-cols-2 gap-4 border-t border-border/70 pt-4">
            <div>
              <h3 className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-foreground">
                Visitors love
              </h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-4 font-sans text-[0.8125rem] leading-snug text-emerald-800">
                {payload.pros.map((p, i) => (
                  <li key={`pro-${i}`}>{p}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-foreground">
                Worth knowing
              </h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-4 font-sans text-[0.8125rem] leading-snug text-rose-900/85">
                {payload.cons.map((c, i) => (
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
  );
}
