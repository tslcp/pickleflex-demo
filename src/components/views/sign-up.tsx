"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/auth-layout";
import { useAuth } from "@/lib/auth-context";
import { AuthProviders } from "@/components/auth-providers";

const inputClass =
  "pf-auth-input";

const SKILL_LEVELS = ["2.5", "3.0", "3.5", "4.0", "4.5", "5.0"];

export function SignUp() {
  const router = useRouter();
  const { setSessionUser } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [skillLevel, setSkillLevel] = useState("3.5");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, zipCode, skillLevel: Number(skillLevel) }),
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
    <AuthLayout signup>
        <div className="pf-auth-card">
          <h1 className="pf-auth-title">Create your account</h1>
          <p className="pf-auth-description">Join PickleFlex to find and register for tournaments.</p>

          <AuthProviders />
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="pf-auth-label">Full Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={inputClass}
                autoComplete="name"
              />
            </label>
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
              <span className="pf-auth-label">Zip Code</span>
              <input
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                required
                pattern="\d{5}(-\d{4})?"
                title="5-digit zip code"
                placeholder="94103"
                className={inputClass}
                autoComplete="postal-code"
                inputMode="numeric"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="pf-auth-label">Skill Level</span>
              <select
                value={skillLevel}
                onChange={(e) => setSkillLevel(e.target.value)}
                className={inputClass}
              >
                {SKILL_LEVELS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="pf-auth-label">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className={inputClass}
                autoComplete="new-password"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="pf-auth-label">Confirm Password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className={inputClass}
                autoComplete="new-password"
              />
            </label>

            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="pf-button pf-auth-submit"
            >
              {submitting ? "Creating account…" : "Create Account"}
            </button>
          </form>
        </div>

        <p className="pf-auth-switch">
          Already have an account?{" "}
          <Link href="/signin" className="font-medium text-[#315840] hover:text-[#183c30] underline underline-offset-4">
            Sign in
          </Link>
        </p>
        <p className="pf-auth-switch pf-auth-switch-secondary">
          <Link href="/forgot-password" className="font-medium text-[#315840] hover:text-[#183c30] underline underline-offset-4">
            Forgot password?
          </Link>
        </p>
    </AuthLayout>
  );
}
