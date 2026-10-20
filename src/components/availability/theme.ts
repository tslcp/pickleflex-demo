import type { AvailabilityKind } from "@/lib/availability";

// The public homepage's palette (.pf-home in globals.css): ink #183c30, paper
// #f7f7ef, cream cards #fffef7, lines #dce1ce, muted #697365, olive #789040,
// lime #deef8a — plus a terracotta for "can't play" that sits with them.
export const card = "rounded-[14px] border border-[#dce1ce] bg-[#fffef7]";
export const smallCaps = "text-[10px] font-semibold uppercase tracking-[1.3px] text-[#697365]";
export const checkboxClass = "h-4 w-4 shrink-0 accent-[#183c30]";

export const primaryBtn =
  "inline-flex min-h-12 items-center gap-6 rounded-[5px] bg-[#183c30] px-[23px] text-sm text-white transition-colors hover:bg-[#315840] disabled:cursor-not-allowed disabled:opacity-50";
export const secondaryBtn =
  "inline-flex min-h-12 items-center justify-center rounded-[5px] border border-[#183c3040] px-4 text-sm text-[#183c30] transition-colors hover:bg-[#f0f3e4] disabled:cursor-not-allowed disabled:opacity-50";
export const dangerBtn =
  "inline-flex min-h-12 items-center justify-center rounded-[5px] bg-[#a8432d] px-4 text-sm text-white transition-colors hover:bg-[#8e3825] disabled:cursor-not-allowed disabled:opacity-50";
export const roundBtn =
  "grid h-[34px] w-[34px] place-items-center rounded-full border border-[#d6dbc9] text-[#183c30] transition-colors hover:border-[#789040] disabled:cursor-default disabled:opacity-30 disabled:hover:border-[#d6dbc9]";

export const KINDS: AvailabilityKind[] = ["available", "unavailable"];
export const KIND_LABEL: Record<AvailabilityKind, string> = { available: "Can play", unavailable: "Can't play" };
export const KIND_DOT: Record<AvailabilityKind, string> = { available: "bg-[#789040]", unavailable: "bg-[#c2553b]" };
export const KIND_SELECTED: Record<AvailabilityKind, string> = {
  available: "bg-[#deef8a] text-[#183c30]",
  unavailable: "bg-[#f4ddd3] text-[#8e3825]",
};

/** Month-view chips and week-view blocks: a tinted fill with a solid edge, Google Calendar style. */
export const KIND_CHIP: Record<AvailabilityKind, string> = {
  available: "border-l-[3px] border-l-[#789040] bg-[#e7f0bf] text-[#183c30]",
  unavailable: "border-l-[3px] border-l-[#c2553b] bg-[#f6e0d6] text-[#8e3825]",
};
