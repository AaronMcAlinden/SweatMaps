import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { createSupabaseServiceClient } from "@/lib/supabase-service";
import type { Venue } from "@/types/venue";
import type { VisitorSummaryPayload } from "@/types/visitor-summary";

const MODEL = "claude-sonnet-4-5";
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function stripJsonFence(text: string): string {
  let t = text.trim();
  if (t.startsWith("```")) {
    const firstNl = t.indexOf("\n");
    const close = t.lastIndexOf("```");
    if (firstNl !== -1 && close > firstNl) {
      t = t.slice(firstNl + 1, close).trim();
    }
  }
  return t;
}

function parseVisitorSummaryJson(text: string): VisitorSummaryPayload | null {
  try {
    const raw = JSON.parse(stripJsonFence(text)) as unknown;
    if (!raw || typeof raw !== "object") return null;
    const o = raw as Record<string, unknown>;
    if (typeof o.summary !== "string" || !o.summary.trim()) return null;
    if (!Array.isArray(o.pros) || !Array.isArray(o.cons)) return null;
    const pros = o.pros.filter((p): p is string => typeof p === "string");
    const cons = o.cons.filter((c): c is string => typeof c === "string");
    if (pros.length < 3 || cons.length < 2) return null;
    return {
      summary: o.summary.trim(),
      pros: [pros[0], pros[1], pros[2]],
      cons: [cons[0], cons[1]],
    };
  } catch (err) {
    console.error("[buildVisitorSummary] JSON parse error", err);
    return null;
  }
}

function isSummaryGeneratedAtFresh(iso: string): boolean {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  const age = Date.now() - t;
  return age >= 0 && age < CACHE_TTL_MS;
}

function readCachedVisitorSummary(venue: Venue): VisitorSummaryPayload | null {
  const summary = venue.ai_summary?.trim();
  const generatedAt = venue.ai_summary_generated_at;
  if (!summary || !generatedAt) return null;
  if (!isSummaryGeneratedAtFresh(generatedAt)) return null;

  const prosRaw = venue.ai_pros;
  const consRaw = venue.ai_cons;
  if (!Array.isArray(prosRaw) || !Array.isArray(consRaw)) return null;
  const pros = prosRaw.filter((p): p is string => typeof p === "string");
  const cons = consRaw.filter((c): c is string => typeof c === "string");
  if (pros.length < 3 || cons.length < 2) return null;

  console.log("[buildVisitorSummary] Using cached AI summary", {
    venue_id: venue.id,
    ai_summary_generated_at: generatedAt,
  });

  return {
    summary,
    pros: [pros[0], pros[1], pros[2]],
    cons: [cons[0], cons[1]],
  };
}

async function persistVisitorSummary(
  venueId: string,
  payload: VisitorSummaryPayload,
): Promise<void> {
  const service = createSupabaseServiceClient();
  if (!service) {
    console.error(
      "[buildVisitorSummary] Skipping persist — missing service client env",
      { venue_id: venueId },
    );
    return;
  }

  const now = new Date().toISOString();
  const { error } = await service
    .from("venues")
    .update({
      ai_summary: payload.summary,
      ai_pros: [...payload.pros],
      ai_cons: [...payload.cons],
      ai_summary_generated_at: now,
    })
    .eq("id", venueId);

  if (error) {
    console.error("[buildVisitorSummary] Supabase persist failed", {
      venue_id: venueId,
      message: error.message,
    });
  } else {
    console.log("[buildVisitorSummary] Cached summary saved", {
      venue_id: venueId,
      ai_summary_generated_at: now,
    });
  }
}

async function fetchPlaceReviews(
  placeId: string,
  apiKey: string,
): Promise<string[] | null> {
  console.log("[buildVisitorSummary] Google Places request", {
    google_place_id: placeId,
  });

  try {
    const url = new URL(
      "https://maps.googleapis.com/maps/api/place/details/json",
    );
    url.searchParams.set("place_id", placeId);
    url.searchParams.set("fields", "reviews");
    url.searchParams.set("key", apiKey);

    const res = await fetch(url.toString(), {
      next: { revalidate: 3600 },
    });

    console.log("[buildVisitorSummary] Google Places HTTP response", {
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
    });

    const data = (await res.json()) as {
      status?: string;
      error_message?: string;
      result?: { reviews?: { text?: string }[] };
    };

    const rawReviewCount = data.result?.reviews?.length ?? 0;
    console.log("[buildVisitorSummary] Google Places API body", {
      apiStatus: data.status,
      error_message: data.error_message,
      reviewsInResponse: rawReviewCount,
    });

    if (!res.ok) {
      console.error("[buildVisitorSummary] Google Places fetch failed (HTTP)", {
        status: res.status,
        apiStatus: data.status,
        error_message: data.error_message,
      });
      return null;
    }

    if (data.status !== "OK") {
      console.error("[buildVisitorSummary] Google Places API not OK", {
        apiStatus: data.status,
        error_message: data.error_message,
      });
      return null;
    }

    const texts = (data.result?.reviews ?? [])
      .slice(0, 5)
      .map((r) => (typeof r.text === "string" ? r.text.trim() : ""))
      .filter(Boolean);

    console.log("[buildVisitorSummary] Google Places reviews after filter", {
      usableReviewCount: texts.length,
    });

    if (!texts.length) {
      return null;
    }

    return texts;
  } catch (err) {
    console.error("[buildVisitorSummary] Google Places request error", err);
    return null;
  }
}

async function generateVisitorSummaryWithApis(
  venue: Venue,
): Promise<VisitorSummaryPayload | null> {
  const placeId = venue.google_place_id?.trim();
  const googleKey = process.env.GOOGLE_PLACES_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!placeId || !googleKey || !anthropicKey) {
    console.log("[buildVisitorSummary] Skipping generation — missing input or env", {
      google_place_id: placeId ?? null,
      hasGooglePlacesApiKey: Boolean(googleKey),
      hasAnthropicApiKey: Boolean(anthropicKey),
    });
    return null;
  }

  const reviewTexts = await fetchPlaceReviews(placeId, googleKey);

  if (!reviewTexts?.length) {
    console.log("[buildVisitorSummary] No usable reviews — using placeholder", {
      google_place_id: placeId,
    });
    return null;
  }

  const reviewsBlock = reviewTexts
    .map((text, i) => `Review ${i + 1}:\n${text}`)
    .join("\n\n---\n\n");

  const system = `You are summarising visitor reviews for a wellness venue called ${venue.name}. Analyse the reviews and return ONLY a valid JSON object with exactly these fields: summary (3-4 sentence balanced overview covering atmosphere, staff and value), pros (array of exactly 3 short strings of praised aspects), cons (array of exactly 2 short strings of drawbacks). Return only the JSON object, no markdown, no explanation.`;

  const userContent = `Here are Google Maps reviews for this venue:\n\n${reviewsBlock}`;

  try {
    const anthropic = new Anthropic({ apiKey: anthropicKey });
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: userContent }],
    });

    const block = response.content[0];
    if (block.type !== "text" || !block.text?.trim()) {
      console.error("[buildVisitorSummary] Anthropic empty or non-text block", {
        blockType: block.type,
      });
      return null;
    }

    const parsed = parseVisitorSummaryJson(block.text);
    if (!parsed) {
      console.error(
        "[buildVisitorSummary] Could not parse visitor summary JSON from model",
        {
          responsePreview: block.text.slice(0, 280),
        },
      );
    } else {
      console.log("[buildVisitorSummary] Visitor summary OK", {
        google_place_id: placeId,
        reviewCountUsed: reviewTexts.length,
      });
    }
    return parsed;
  } catch (err) {
    console.error("[buildVisitorSummary] Anthropic API error", err);
    return null;
  }
}

export async function buildVisitorSummary(
  venue: Venue,
): Promise<VisitorSummaryPayload | null> {
  const cached = readCachedVisitorSummary(venue);
  if (cached) {
    return cached;
  }

  const fresh = await generateVisitorSummaryWithApis(venue);
  if (fresh) {
    await persistVisitorSummary(venue.id, fresh);
  }
  return fresh;
}
