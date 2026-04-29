import { resolveBackendUrl } from "@/app/lib/backendUrl";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ip = searchParams.get("ip");
    const trimmedBack = process.env.BACKEND_URL?.trim();
    const base = trimmedBack
      ? trimmedBack.replace(/\/+$/, "")
      : resolveBackendUrl();
    const backendUrl = new URL(`${base}/api/ip/details`);
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
