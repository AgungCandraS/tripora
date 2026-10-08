import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ path: string[] }> };

async function proxy(request: NextRequest, context: Context) {
  const upstream = process.env.API_URL;
  if (!upstream) {
    return Response.json(
      {
        success: false,
        error: {
          code: "API_UNAVAILABLE",
          message:
            "Layanan pemesanan belum tersedia. Silakan coba kembali nanti.",
        },
      },
      { status: 503 },
    );
  }
  const { path } = await context.params;
  const target = new URL(
    `/api/v1/${path.map(encodeURIComponent).join("/")}`,
    upstream,
  );
  target.search = request.nextUrl.search;
  const headers = new Headers();
  for (const name of [
    "content-type",
    "cookie",
    "authorization",
    "origin",
    "accept",
  ]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  try {
    const response = await fetch(target, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method)
        ? undefined
        : await request.arrayBuffer(),
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(90000),
    });
    const output = new Headers({ "Cache-Control": "private, no-store" });
    for (const name of [
      "content-type",
      "content-disposition",
      "location",
      "retry-after",
    ]) {
      const value = response.headers.get(name);
      if (value) output.set(name, value);
    }
    // Keep access and refresh cookies as separate headers on the frontend origin.
    // This preserves SameSite=Lax without allowing third-party session cookies.
    for (const cookie of response.headers.getSetCookie())
      output.append("set-cookie", cookie);
    return new Response(response.body, {
      status: response.status,
      headers: output,
    });
  } catch {
    return Response.json(
      {
        success: false,
        error: {
          code: "API_UNAVAILABLE",
          message:
            "Layanan pemesanan belum dapat dihubungi. Silakan coba kembali.",
        },
      },
      { status: 503 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const HEAD = proxy;
