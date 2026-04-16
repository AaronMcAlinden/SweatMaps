import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get("place_id")?.trim() ?? "";

  if (!key) {
    return NextResponse.json(
      { error: "GOOGLE_PLACES_API_KEY not configured" },
      { status: 503 },
    );
  }

  if (!placeId) {
    return NextResponse.json({ error: "place_id required" }, { status: 400 });
  }

  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/details/json",
  );
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "geometry,formatted_address,name");
  url.searchParams.set("key", key);

  try {
    const res = await fetch(url.toString());
    const data = (await res.json()) as {
      status?: string;
      error_message?: string;
      result?: {
        geometry?: { location?: { lat: number; lng: number } };
        formatted_address?: string;
        name?: string;
      };
    };

    if (data.status !== "OK" || !data.result?.geometry?.location) {
      return NextResponse.json(
        {
          status: data.status,
          error_message: data.error_message,
        },
        { status: 404 },
      );
    }

    const { lat, lng } = data.result.geometry.location;
    return NextResponse.json({
      status: data.status,
      lat,
      lng,
      label:
        data.result.formatted_address ??
        data.result.name ??
        placeId,
    });
  } catch (e) {
    console.error("[places/details]", e);
    return NextResponse.json(
      { error: "Place details failed" },
      { status: 500 },
    );
  }
}
