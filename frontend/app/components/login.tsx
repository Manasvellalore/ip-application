"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BargadShellHeader from "@/app/components/BargadShellHeader";

const IPV4_RE =
  /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d?\d)$/;

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "ip">("login");
  const [formData, setFormData] = useState({ employeeId: "", firstName: "", lastName: "" });
  const [error, setError] = useState("");
  const [ipInput, setIpInput] = useState("");
  const [ipError, setIpError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const alphaRegex = /^[A-Za-z]+$/;

    if (!alphaRegex.test(formData.firstName)) {
      setError("First name must contain only alphabetic characters.");
      return;
    }

    if (!alphaRegex.test(formData.lastName)) {
      setError("Last name must contain only alphabetic characters.");
      return;
    }

    const fullName = `${formData.firstName} ${formData.lastName}`.trim();

    localStorage.setItem("user_id", formData.employeeId);
    localStorage.setItem("user_name", fullName);

    router.push("/dashboard");
  };

  const handleIpLookup = (e: React.FormEvent) => {
    e.preventDefault();
    setIpError("");
    const trimmed = ipInput.trim();
    if (!trimmed) {
      setIpError("Enter an IP address.");
      return;
    }
    if (!IPV4_RE.test(trimmed)) {
      setIpError("Enter a valid IPv4 address.");
      return;
    }
    router.push(`/ip-check?ip=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[#000000]">
      <BargadShellHeader />

      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-[#000000]">
        <div className="relative z-10 mx-4 w-full max-w-md">
          <div className="rounded-2xl border border-[#24aa4d]/20 bg-black/40 p-8 shadow-[0_0_50px_-12px_rgba(36,170,77,0.3)] backdrop-blur-xl">
            <div className="mb-8 flex justify-center gap-1 rounded-xl border border-[#24aa4d]/25 bg-black/40 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setIpError("");
                }}
                className={`flex-1 rounded-lg py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors ${
                  mode === "login"
                    ? "bg-[#24aa4d] text-black"
                    : "text-white/50 hover:text-white"
                }`}
              >
                LOCATION DETAILS
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("ip");
                  setError("");
                }}
                className={`flex-1 rounded-lg py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors ${
                  mode === "ip"
                    ? "bg-[#24aa4d] text-black"
                    : "text-white/50 hover:text-white"
                }`}
              >
                IP lookup
              </button>
            </div>

            {mode === "login" ? (
              <>
                <div className="mb-8 text-center">
                  <h2 className="text-2xl font-black uppercase tracking-widest text-white">
                    System <span className="text-[#24aa4d]">Entry</span>
                  </h2>
                  {error && (
                    <p className="mt-4 rounded border border-red-500/20 bg-red-500/10 p-2 text-[10px] font-bold text-red-500">
                      {error}
                    </p>
                  )}
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-[#24aa4d]">
                          First Name
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. John"
                          className="h-12 w-full rounded-xl border border-[#24aa4d]/20 bg-white/5 px-4 text-white outline-none placeholder:text-white/20 focus:border-[#5edd7c]"
                          onChange={(e) =>
                            setFormData({ ...formData, firstName: e.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-[#24aa4d]">
                          Last Name
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Doe"
                          className="h-12 w-full rounded-xl border border-[#24aa4d]/20 bg-white/5 px-4 text-white outline-none placeholder:text-white/20 focus:border-[#5edd7c]"
                          onChange={(e) =>
                            setFormData({ ...formData, lastName: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-[#24aa4d]">
                        Employee ID
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. EMP001"
                        className="h-12 w-full rounded-xl border border-[#24aa4d]/20 bg-white/5 px-4 text-white outline-none placeholder:text-white/20 focus:border-[#5edd7c]"
                        onChange={(e) =>
                          setFormData({ ...formData, employeeId: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="h-12 w-full rounded-xl bg-white text-xs font-black uppercase tracking-widest text-black transition-all hover:bg-[#5edd7c]"
                  >
                    Continue
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="mb-8 text-center">
                  <h2 className="text-2xl font-black uppercase tracking-widest text-white">
                    Direct <span className="text-[#24aa4d]">IP</span>
                  </h2>
                  {ipError && (
                    <p className="mt-4 rounded border border-red-500/20 bg-red-500/10 p-2 text-[10px] font-bold text-red-500">
                      {ipError}
                    </p>
                  )}
                </div>

                <form onSubmit={handleIpLookup} className="space-y-6">
                  <div className="space-y-1">
                    <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-[#24aa4d]">
                      IPv4 address
                    </label>
                    <input
                      type="text"
                      value={ipInput}
                      onChange={(e) => setIpInput(e.target.value)}
                      placeholder="e.g. 8.8.8.8"
                      className="h-12 w-full rounded-xl border border-[#24aa4d]/20 bg-white/5 px-4 font-mono text-sm text-white outline-none placeholder:text-white/20 focus:border-[#5edd7c]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="h-12 w-full rounded-xl bg-white text-xs font-black uppercase tracking-widest text-black transition-all hover:bg-[#5edd7c]"
                  >
                    View intelligence
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
