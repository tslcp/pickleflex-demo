"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchBracket } from "@/lib/bracket-client";
import type { BracketDTO } from "@/lib/bracket-types";

export function useBracket(tournamentId: string, divisionId: string) {
  const [bracket, setBracket] = useState<BracketDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchBracket(tournamentId, divisionId);
      setBracket(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load bracket.");
    } finally {
      setLoading(false);
    }
  }, [tournamentId, divisionId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { bracket, loading, error, refetch, setBracket };
}
