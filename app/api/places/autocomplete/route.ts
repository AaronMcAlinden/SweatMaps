import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const { searchParams } = new URL(request.url);
  const input = searchParams.get("input")?.trim() ?? "";

  if (!key) {
    return NextResponse.json(
      { error: "GOOGLE_PLACES_API_KEY not configured", predictions: [] },
      { status: 503 },
    );
  }

  if (input.length < 2) {
    return NextResponse.json({ predictions: [], status: "ZERO_INPUT" });
  }

  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/autocomplete/json",
  );
  url.searchParams.set("input", input);
  url.searchParams.set("types", "(cities)");
  url.searchParams.set("components", "country:gb|country:ie");
  url.searchParams.set("key", key);

  try {
    const res = await fetch(url.toString());
    const data = (await res.json()) as {
      status?: string;
      predictions?: {
        description: string;
        place_id: string;
      }[];
      error_message?: string;
    };

    return NextResponse.json({
      status: data.status,
      error_message: data.error_message,
      predictions: data.predictions ?? [],
    });
  } catch (e) {
    console.error("[places/autocomplete]", e);
    return NextResponse.json(
      { error: "Autocomplete failed", predictions: [] },
      { status: 500 },
    );
  }
}
