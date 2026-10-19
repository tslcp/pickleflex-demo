"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/auth-layout";
import { useAuth } from "@/lib/auth-context";
import { AuthProviders } from "@/components/auth-providers";

const inputClass =
  "pf-auth-input";

export function SignIn() {
  const router = useRouter();
  const { setSessionUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setSessionUser(data);
      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
        <div className="pf-auth-card">
          <h1 className="pf-auth-title">Welcome back</h1>
          <p className="pf-auth-description">Sign in to manage your matches and tournaments.</p>

          <AuthProviders />
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="pf-auth-label">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputClass}
                autoComplete="email"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="pf-auth-label">Password</span>
                <Link href="/forgot-password" className="text-xs font-medium text-[#315840] hover:text-[#183c30] underline underline-offset-4">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={inputClass}
                autoComplete="current-password"
              />
            </label>

            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="pf-button pf-auth-submit"
            >
              {submitting ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>

        <p className="pf-auth-switch">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-[#315840] hover:text-[#183c30] underline underline-offset-4">
            Sign up
          </Link>
        </p>
    </AuthLayout>
  );
}
