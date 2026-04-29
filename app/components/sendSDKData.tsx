import { resolveBackendUrl } from "@/app/lib/backendUrl";
import { collectSdkData, type CollectSdkDataOptions } from "./sdkCollector";

export async function sendSdkData(options?: CollectSdkDataOptions) {
  const sdkData = await collectSdkData(options);
  const backendUrl = resolveBackendUrl();

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