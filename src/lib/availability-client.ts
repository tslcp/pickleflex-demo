import type { AvailabilityEntry, NewAvailabilityEntry } from "@/lib/availability";

async function handle(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Request failed.");
  return data;
}

export async function fetchAvailability(): Promise<AvailabilityEntry[]> {
  return handle(await fetch("/api/availability"));
}

/** Either the saved, updated list — or, when nothing was saved, the entries it clashed with. */
export type CreateAvailabilityResult = { entries: AvailabilityEntry[] } | { conflicts: AvailabilityEntry[] };

export async function createAvailabilityRequest(
  entry: NewAvailabilityEntry,
  options: { today: string; override?: boolean },
): Promise<CreateAvailabilityResult> {
  const res = await fetch("/api/availability", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...entry, ...options }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 409 && Array.isArray(data.conflicts)) return { conflicts: data.conflicts };
  if (!res.ok) throw new Error(data.error ?? "Request failed.");
  return { entries: data };
}

/**
 * Deletes an entry — or, given `days`, only a repeat's days in that inclusive
 * range (a null bound is open-ended). Resolves to the updated list.
 */
export async function deleteAvailabilityRequest(
  entryId: string,
  days?: { from: string | null; to: string | null },
): Promise<AvailabilityEntry[]> {
  const query = new URLSearchParams();
  if (days?.from) query.set("from", days.from);
  if (days?.to) query.set("to", days.to);
  const search = query.toString() ? `?${query}` : "";
  return handle(await fetch(`/api/availability/${encodeURIComponent(entryId)}${search}`, { method: "DELETE" }));
}
