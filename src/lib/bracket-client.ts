import type { BracketDTO, GenerateBracketInput } from "@/lib/bracket-types";

async function handle(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Request failed.");
  return data;
}

export async function fetchBracket(
  tournamentId: string,
  divisionId: string,
  cohortId: string,
): Promise<BracketDTO | null> {
  const res = await fetch(
    `/api/brackets?tournamentId=${encodeURIComponent(tournamentId)}&divisionId=${encodeURIComponent(divisionId)}&cohortId=${encodeURIComponent(cohortId)}`,
  );
  if (res.status === 404) return null;
  return handle(res);
}

export async function generateBracketRequest(input: GenerateBracketInput): Promise<BracketDTO> {
  const res = await fetch("/api/brackets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handle(res);
}

export async function submitScoreRequest(matchId: string, scoreA: number, scoreB: number): Promise<BracketDTO> {
  const res = await fetch(`/api/brackets/matches/${matchId}/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scoreA, scoreB }),
  });
  return handle(res);
}

export async function requestRescheduleRequest(
  matchId: string,
  participantId: string,
  options: { adminOverride?: boolean; customDateTime?: string } = {},
): Promise<BracketDTO> {
  const res = await fetch(`/api/brackets/matches/${matchId}/reschedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ participantId, ...options }),
  });
  return handle(res);
}

export async function adminScheduleRequest(matchId: string, dateTime: string): Promise<BracketDTO> {
  const res = await fetch(`/api/brackets/matches/${matchId}/schedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dateTime }),
  });
  return handle(res);
}
