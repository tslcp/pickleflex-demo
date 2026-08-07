"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleDot } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const inputClass =
  "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";

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
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500">
            <CircleDot className="h-5 w-5 text-slate-900" strokeWidth={2.5} />
          </div>
          <p className="text-lg font-bold tracking-tight text-zinc-900">
            Pickle<span className="text-emerald-600">Flex</span>
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
          <h1 className="text-lg font-semibold text-zinc-900">Create your account</h1>
          <p className="mt-1 text-sm text-zinc-500">Join PickleFlex to find and register for tournaments.</p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-zinc-700">Full Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={inputClass}
                autoComplete="name"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-zinc-700">Email</span>
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
              <span className="font-medium text-zinc-700">Zip Code</span>
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
              <span className="font-medium text-zinc-700">Skill Level</span>
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
              <span className="font-medium text-zinc-700">Password</span>
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
              <span className="font-medium text-zinc-700">Confirm Password</span>
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

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              {submitting ? "Creating account…" : "Create Account"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <Link href="/signin" className="font-medium text-emerald-600 hover:text-emerald-700">
            Sign in
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-zinc-500">
          <Link href="/forgot-password" className="font-medium text-emerald-600 hover:text-emerald-700">
            Forgot password?
          </Link>
        </p>
      </div>
    </div>
  );
}
