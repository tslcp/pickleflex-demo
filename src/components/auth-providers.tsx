"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

const errors: Record<string, string> = {
  configuration: "Google sign-in is not configured yet. Please use email and password.",
  google: "Google sign-in was cancelled or could not be completed. Please try again.",
  existing: "An account with this email already exists. Please sign in with your password.",
};

// Add future providers here once their server authentication flow is available.
const providers = [{ id: "google", label: "Continue with Google", href: "/api/auth/google" },
  { id: "future", label: "More sign-in options", href: null }];

function ProviderOptions() {
  const code = useSearchParams().get("authError");
  const error = code ? errors[code] ?? errors.google : "";
  return <div className="mt-6 space-y-3">
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {providers.map((provider) => provider.href ? (
      <a key={provider.id} href={provider.href} className="flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50">
        <span aria-hidden="true" className="text-lg font-bold text-blue-600">G</span>{provider.label}
      </a>
    ) : <button key={provider.id} type="button" disabled className="w-full cursor-not-allowed rounded-lg border border-dashed border-zinc-200 px-4 py-2.5 text-sm text-zinc-400">{provider.label} · Coming soon</button>)}
    <div className="flex items-center gap-3 pt-2 text-xs text-zinc-400"><span className="h-px flex-1 bg-zinc-200" />or continue with email<span className="h-px flex-1 bg-zinc-200" /></div>
  </div>;
}

export function AuthProviders() {
  return <Suspense><ProviderOptions /></Suspense>;
}
