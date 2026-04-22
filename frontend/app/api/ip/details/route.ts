import { NextResponse } from "next/server";

const BACKEND_BASE_URL =
  process.env.BACKEND_URL ??
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  "https://test-app-backend-uyyi.onrender.com";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ip = searchParams.get("ip");
    const backendUrl = new URL(`${BACKEND_BASE_URL}/api/ip/details`);
    if (ip?.trim()) {
      backendUrl.searchParams.set("ip", ip.trim());
    }

    const response = await fetch(backendUrl.toString(), {
      method: "GET",
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json")
      ? await response.json()
      : { error: "Invalid backend response format." };

    return NextResponse.json(body, { status: response.status });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch IP details from backend." },
      { status: 502 }
    );
  }
}
