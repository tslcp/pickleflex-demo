"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import * as store from "@/lib/tournament-store";
import type { Registration, Tournament, TournamentMatch } from "@/lib/types";

export interface MatchWithContext extends TournamentMatch {
  tournament: Tournament;
  opponent: Registration;
  self: Registration;
}

interface TournamentContextValue {
  tournaments: Tournament[];
  registrations: Registration[];
  matches: TournamentMatch[];
  registerForTournament: typeof store.registerForTournament;
  cancelRegistration: typeof store.cancelRegistration;
  removeRegistration: typeof store.removeRegistration;
  clearTestRegistrations: typeof store.clearTestRegistrations;
  createTournament: typeof store.createTournament;
  deleteTournament: typeof store.deleteTournament;
  addTestRegistration: typeof store.addTestRegistration;
  myRegistration: (tournamentId: string) => Registration | undefined;
  registrationsFor: (tournamentId: string, divisionId?: string) => Registration[];
  generateSchedule: typeof store.generateSchedule;
  scheduleMatch: typeof store.scheduleMatch;
  reportScore: typeof store.reportScore;
  confirmScore: typeof store.confirmScore;
  disputeScore: typeof store.disputeScore;
  resolveDispute: typeof store.resolveDispute;
  myMatches: MatchWithContext[];
}

const TournamentContext = createContext<TournamentContextValue | null>(null);

export function TournamentProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);

  useEffect(() => {
    store.hydrate();
  }, []);

  const myRegistration = (tournamentId: string) =>
    state.registrations.find((r) => r.tournamentId === tournamentId && r.isCurrentUser);

  const registrationsFor = (tournamentId: string, divisionId?: string) =>
    state.registrations.filter(
      (r) => r.tournamentId === tournamentId && (divisionId ? r.divisionId === divisionId : true),
    );

  const myMatches = useMemo<MatchWithContext[]>(() => {
    const myRegIds = new Map(
      state.registrations.filter((r) => r.isCurrentUser).map((r) => [r.id, r] as const),
    );
    const regById = new Map(state.registrations.map((r) => [r.id, r] as const));
    const tournamentById = new Map(state.tournaments.map((t) => [t.id, t] as const));

    return state.matches
      .filter((m) => myRegIds.has(m.playerAId) || myRegIds.has(m.playerBId))
      .map((m) => {
        const self = myRegIds.get(m.playerAId) ?? myRegIds.get(m.playerBId)!;
        const opponentId = m.playerAId === self.id ? m.playerBId : m.playerAId;
        const opponent = regById.get(opponentId)!;
        const tournament = tournamentById.get(m.tournamentId)!;
        return { ...m, tournament, opponent, self };
      });
  }, [state.matches, state.registrations, state.tournaments]);

  const value: TournamentContextValue = {
    ...state,
    registerForTournament: store.registerForTournament,
    cancelRegistration: store.cancelRegistration,
    removeRegistration: store.removeRegistration,
    clearTestRegistrations: store.clearTestRegistrations,
    createTournament: store.createTournament,
    deleteTournament: store.deleteTournament,
    addTestRegistration: store.addTestRegistration,
    myRegistration,
    registrationsFor,
    generateSchedule: store.generateSchedule,
    scheduleMatch: store.scheduleMatch,
    reportScore: store.reportScore,
    confirmScore: store.confirmScore,
    disputeScore: store.disputeScore,
    resolveDispute: store.resolveDispute,
    myMatches,
  };

  return <TournamentContext.Provider value={value}>{children}</TournamentContext.Provider>;
}

export function useTournaments() {
  const ctx = useContext(TournamentContext);
  if (!ctx) throw new Error("useTournaments must be used within a TournamentProvider");
  return ctx;
}
