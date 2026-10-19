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

/** Which part of an entry to delete: just that row, its whole repeat, or the repeat's days in a range. */
export type DeleteTarget = { series: boolean } | { from: string | null; to: string | null };

/** Resolves to the updated list. `today` lets the server drop leftover parts that only cover the past. */
export async function deleteAvailabilityRequest(
  entryId: string,
  target: DeleteTarget,
  today: string,
): Promise<AvailabilityEntry[]> {
  const query = new URLSearchParams({ today });
  if ("series" in target) {
    if (target.series) query.set("series", "1");
  } else {
    if (target.from) query.set("from", target.from);
    if (target.to) query.set("to", target.to);
  }
  return handle(await fetch(`/api/availability/${encodeURIComponent(entryId)}?${query}`, { method: "DELETE" }));
}
