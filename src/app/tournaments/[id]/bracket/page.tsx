import { Suspense } from "react";
import { TournamentBracketView } from "@/components/views/tournament-bracket-view";

export default async function TournamentBracketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<p className="text-sm text-zinc-400">Loading…</p>}>
      <TournamentBracketView id={id} />
    </Suspense>
  );
}
