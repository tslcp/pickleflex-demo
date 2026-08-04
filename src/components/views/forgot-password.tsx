"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, CircleDot, Mail } from "lucide-react";

const inputClass =
  "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
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
          {submitted ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <Mail className="h-6 w-6 text-emerald-600" />
              </div>
              <h1 className="text-lg font-semibold text-zinc-900">Check your email</h1>
              <p className="text-sm text-zinc-500">
                If an account exists for <span className="font-medium text-zinc-700">{email}</span>,
                we&apos;ve sent a link to reset your password.
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-semibold text-zinc-900">Reset your password</h1>
              <p className="mt-1 text-sm text-zinc-500">
                Enter your email and we&apos;ll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
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

                <button
                  type="submit"
                  className="mt-2 inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
                >
                  Send Reset Link
                </button>
              </form>
            </>
          )}
        </div>

        <Link
          href="/signin"
          className="mt-6 flex items-center justify-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
        </Link>
      </div>
    </div>
  );
}
