// components/ClientInit.tsx
"use client";

import { useEffect } from "react";
import { sendSdkData } from "@/app/components/sendSDKData";

export default function ClientInit() {
  useEffect(() => {
    sendSdkData();
  }, []);

  return null;
}