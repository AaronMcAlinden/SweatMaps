import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (!key) {
    return NextResponse.json(
      { error: "GOOGLE_PLACES_API_KEY not configured" },
      { status: 503 },
    );
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("latlng", `${lat},${lng}`);
  url.searchParams.set("key", key);

  try {
    const res = await fetch(url.toString());
    const data = (await res.json()) as {
      status?: string;
      results?: { formatted_address: string }[];
      error_message?: string;
    };

    if (data.status !== "OK" || !data.results?.[0]) {
      return NextResponse.json(
        {
          status: data.status,
          error_message: data.error_message,
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      label: data.results[0].formatted_address,
      lat,
      lng,
    });
  } catch (e) {
    console.error("[places/reverse]", e);
    return NextResponse.json(
      { error: "Reverse geocode failed" },
      { status: 500 },
    );
  }
}
