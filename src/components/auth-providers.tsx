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
  return <div className="pf-auth-providers">
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {providers.map((provider) => provider.href ? (
      <a key={provider.id} href={provider.href} className="pf-auth-provider">
        <span aria-hidden="true" className="text-lg font-bold text-blue-600">G</span>{provider.label}
      </a>
    ) : <button key={provider.id} type="button" disabled className="pf-auth-provider pf-auth-provider-soon">{provider.label} · Coming soon</button>)}
    <div className="pf-auth-divider"><span />or continue with email<span /></div>
  </div>;
}

export function AuthProviders() {
  return <Suspense><ProviderOptions /></Suspense>;
}
