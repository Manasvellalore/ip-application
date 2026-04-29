// components/ClientInit.tsx
"use client";

import { useEffect } from "react";
import { sendSdkData } from "@/app/components/sendSDKData";

export default function ClientInit() {
  useEffect(() => {
    void sendSdkData().catch(() => {
      /* logged by callers that need telemetry; avoid unhandled rejection on "/" */
    });
  }, []);

  return null;
}