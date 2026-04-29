import { collectSdkData, type CollectSdkDataOptions } from "./sdkCollector";

export async function sendSdkData(options?: CollectSdkDataOptions) {
  const sdkData = await collectSdkData(options);
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://test-app-backend-uyyi.onrender.com";

  const res = await fetch(`${backendUrl}/sdk-data`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(sdkData),
  });

  if (!res.ok) {
    throw new Error(`SDK POST failed: ${res.status}`);
  }

  return res.json();
}