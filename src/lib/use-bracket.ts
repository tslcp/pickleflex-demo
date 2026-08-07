"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchBracket } from "@/lib/bracket-client";
import type { BracketDTO } from "@/lib/bracket-types";

export function useBracket(tournamentId: string, divisionId: string, cohortId: string) {
  const [bracket, setBracket] = useState<BracketDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchBracket(tournamentId, divisionId, cohortId);
      setBracket(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load bracket.");
    } finally {
      setLoading(false);
    }
  }, [tournamentId, divisionId, cohortId]);

  useEffect(() => {
    // Fetch-on-mount/dependency-change — the standard data-fetching effect
    // shape. react-hooks/set-state-in-effect flags this generically even
    // though there's no external system to subscribe to here instead.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch();
  }, [refetch]);

  return { bracket, loading, error, refetch, setBracket };
}
