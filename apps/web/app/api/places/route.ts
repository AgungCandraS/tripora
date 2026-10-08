import { searchPlaces } from "../../lib/places";

export function GET(request: Request) {
  return Response.json(searchPlaces(new URL(request.url).searchParams), {
    headers: { "Cache-Control": "public, max-age=60" },
  });
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const ids =
    body && typeof body === "object" && "ids" in body ? body.ids : null;
  if (
    !Array.isArray(ids) ||
    ids.length > 1000 ||
    !ids.every((id) => typeof id === "string" && id.length <= 200)
  )
    return Response.json(
      { error: "Daftar tempat tidak valid." },
      { status: 400 },
    );
  const params = new URL(request.url).searchParams;
  params.set("ids", ids.join(","));
  return Response.json(searchPlaces(params), {
    headers: { "Cache-Control": "no-store" },
  });
}
