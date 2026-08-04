"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, CheckCircle2, ChevronRight, X } from "lucide-react";
import { CohortAvailabilityPicker } from "@/components/cohort-availability-picker";
import { Field, Row } from "@/components/tournament-overview";
import { useAuth } from "@/lib/auth-context";
import { useTournaments } from "@/lib/tournament-context";
import { formatBlock } from "@/lib/scheduling";
import type { DayAvailability, Tournament } from "@/lib/types";

const inputClass =
  "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";

const MIN_AVAILABILITY_DAYS = 2;
const STEPS = ["Your Info", "Division", "Availability", "Review"] as const;

interface SignupWizardModalProps {
  tournament: Tournament;
  onClose: () => void;
}

export function SignupWizardModal({ tournament, onClose }: SignupWizardModalProps) {
  const { user } = useAuth();
  const { registerForTournament, registrationsFor } = useTournaments();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [divisionId, setDivisionId] = useState(tournament.divisions?.[0]?.id ?? "");
  const [cohortId, setCohortId] = useState(tournament.cohorts?.[0]?.id ?? "");
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const isAvailabilityValid = availability.length >= MIN_AVAILABILITY_DAYS;
  const stepValid = [Boolean(name.trim() && email.trim()), Boolean(divisionId), isAvailabilityValid, true][step];

  function goNext() {
    if (step < STEPS.length - 1 && stepValid) setStep((s) => s + 1);
  }

  function goBack() {
    if (step > 0) setStep((s) => s - 1);
  }

  function handleConfirm() {
    registerForTournament(tournament.id, { name, email, divisionId, cohortId, availability });
    setSubmitted(true);
  }

  const selectedDivision = tournament.divisions.find((d) => d.id === divisionId);
  const selectedCohort = tournament.cohorts.find((c) => c.id === cohortId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              {submitted ? "Complete" : `Step ${step + 1} of ${STEPS.length}`}
            </p>
            <h2 className="text-base font-semibold text-zinc-900">
              {submitted ? "You're Registered" : STEPS[step]}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!submitted && (
          <div className="flex gap-1.5 px-5 pt-4">
            {STEPS.map((s, i) => (
              <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-emerald-500" : "bg-zinc-200"}`} />
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {submitted ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <p className="text-sm text-zinc-600">
                You&apos;re registered for <span className="font-medium text-zinc-900">{tournament.name}</span>{" "}
                in the <span className="font-medium text-zinc-900">{selectedDivision?.label}</span> division.
                No payment is required now — the ${tournament.entryFee} entry fee is collected at check-in.
              </p>
            </div>
          ) : (
            <>
              {step === 0 && (
                <div className="flex flex-col gap-4">
                  <Field label="Full Name">
                    <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required />
                  </Field>
                  <Field label="Email">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </Field>
                </div>
              )}

              {step === 1 && (
                <div className="flex flex-col gap-2">
                  {tournament.divisions.map((d) => {
                    const filled = registrationsFor(tournament.id, d.id).length;
                    const full = filled >= d.maxPlayers;
                    const selected = divisionId === d.id;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        disabled={full}
                        onClick={() => setDivisionId(d.id)}
                        className={`flex items-center justify-between rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                          selected
                            ? "border-emerald-500 bg-emerald-50"
                            : "border-zinc-200 bg-white hover:border-zinc-300"
                        }`}
                      >
                        <div>
                          <p className="text-sm font-medium text-zinc-900">
                            {d.label} · {d.skillLevel} Skill
                          </p>
                          <p className="text-xs text-zinc-500">
                            {filled}/{d.maxPlayers} registered{full ? " · Full" : ""}
                          </p>
                        </div>
                        {selected && <Check className="h-4 w-4 shrink-0 text-emerald-600" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {step === 2 && (
                <div>
                  <CohortAvailabilityPicker
                    cohorts={tournament.cohorts}
                    cohortId={cohortId}
                    onCohortChange={setCohortId}
                    availability={availability}
                    onAvailabilityChange={setAvailability}
                  />
                  {!isAvailabilityValid && (
                    <p className="mt-2 text-xs text-zinc-500">
                      Select at least {MIN_AVAILABILITY_DAYS} days to continue.
                    </p>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="flex flex-col gap-3">
                  <dl className="flex flex-col gap-2 rounded-lg bg-zinc-50 p-4 text-sm">
                    <Row label="Name" value={name} />
                    <Row label="Email" value={email} />
                    <Row
                      label="Division"
                      value={selectedDivision ? `${selectedDivision.label} · ${selectedDivision.skillLevel} Skill` : "—"}
                    />
                    <Row label="Cohort" value={selectedCohort?.label ?? "—"} />
                  </dl>
                  <div className="rounded-lg border border-zinc-100 bg-white p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      Your Availability
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {availability.map((a) => (
                        <div key={a.day} className="flex items-center justify-between text-sm">
                          <span className="font-medium text-zinc-900">{a.day}</span>
                          <span className="text-zinc-500">{formatBlock(a.startHour)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="rounded-lg bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700">
                    No payment required to reserve your spot. The ${tournament.entryFee} entry fee is
                    collected at check-in.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-zinc-200 px-5 py-4">
          {submitted ? (
            <div className="flex w-full items-center justify-end gap-3">
              <Link
                href="/"
                onClick={onClose}
                className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
              >
                View My Dashboard
              </Link>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={goBack}
                disabled={step === 0}
                className="text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Back
              </button>
              {step < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={!stepValid}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-300"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
                >
                  Confirm Registration
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
