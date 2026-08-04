import { TournamentDetailWizard } from "@/components/views/tournament-detail-wizard";

export default async function TournamentWizardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TournamentDetailWizard id={id} />;
}
