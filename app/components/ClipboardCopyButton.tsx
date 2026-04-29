"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function ClipboardCopyButton({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        if (!text) return;
        void navigator.clipboard
          .writeText(text)
          .then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
          })
          .catch(() => {});
      }}
      disabled={!text}
      className={className}
      aria-label={copied ? "Copied" : "Copy to clipboard"}
    >
      {copied ? <Check className="h-4 w-4 shrink-0" strokeWidth={2.25} /> : <Copy className="h-4 w-4 shrink-0" />}
    </button>
  );
}
