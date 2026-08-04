"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Mail } from "lucide-react";
import { SignupWizardModal } from "@/components/signup-wizard-modal";
import { Card, Row, TournamentDetailsSections, TournamentHero } from "@/components/tournament-overview";
import { useTournaments } from "@/lib/tournament-context";
import { formatDate } from "@/lib/format";
import { formatBlock } from "@/lib/scheduling";

export function TournamentDetailWizard({ id }: { id: string }) {
  const { tournaments, myRegistration, cancelRegistration } = useTournaments();
  const tournament = tournaments.find((t) => t.id === id);
  const [modalOpen, setModalOpen] = useState(false);

  if (!tournament) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
        <p className="text-sm text-zinc-500">This tournament could not be found.</p>
        <Link
          href="/tournaments"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Tournaments
        </Link>
      </div>
    );
  }

  const registration = myRegistration(tournament.id);
  const registeredCohort = registration
    ? tournament.cohorts.find((c) => c.id === registration.cohortId)
    : undefined;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/tournaments"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Tournaments
        </Link>
        <Link
          href={`/tournaments/${id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          Preview all-in-one signup version <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <TournamentHero tournament={tournament}>
        {!registration && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-emerald-400"
          >
            Reserve My Spot
          </button>
        )}
      </TournamentHero>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <TournamentDetailsSections tournament={tournament} />
        </div>

        <div className="order-first flex flex-col gap-6 lg:order-none">
          <div className="lg:sticky lg:top-24 flex flex-col gap-6">
            <Card title={registration ? "You're Registered" : "Ready to Play?"} accent>
              {registration ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-sm font-medium">Registration confirmed</span>
                  </div>
                  <dl className="flex flex-col gap-2 text-sm">
                    <Row
                      label="Division"
                      value={
                        tournament.divisions.find((d) => d.id === registration.divisionId)?.label ?? "—"
                      }
                    />
                    <Row label="Cohort" value={registeredCohort?.label ?? "—"} />
                    <Row label="Registered" value={formatDate(registration.registeredAt)} />
                    <Row label="Entry Fee" value={`$${tournament.entryFee} — pay at check-in`} />
                  </dl>

                  <div className="rounded-lg bg-white p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      Your Availability
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {registration.availability.map((a) => (
                        <div key={a.day} className="flex items-center justify-between text-sm">
                          <span className="font-medium text-zinc-900">{a.day}</span>
                          <span className="text-zinc-500">{formatBlock(a.startHour)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Link
                    href="/"
                    className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                  >
                    View My Dashboard
                  </Link>
                  {tournament.status === "registration_open" && (
                    <button
                      type="button"
                      onClick={() => cancelRegistration(tournament.id)}
                      className="text-sm font-medium text-red-500 hover:text-red-600"
                    >
                      Cancel registration
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-zinc-600">
                    Reserve your spot in a few quick steps — no payment required now. We&apos;ll guide you
                    through picking a division and your weekly availability.
                  </p>
                  <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
                  >
                    Reserve My Spot
                  </button>
                </div>
              )}
            </Card>

            <Card title="Event Organizer">
              <div className="flex flex-col gap-2 text-sm text-zinc-600">
                <p className="font-medium text-zinc-900">{tournament.organizer}</p>
                <p className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {tournament.organizerEmail}
                </p>
                <p className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Registration closes {formatDate(tournament.registrationDeadline)}
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {modalOpen && (
        <SignupWizardModal tournament={tournament} onClose={() => setModalOpen(false)} />
      )}
    </div>
  );
}
