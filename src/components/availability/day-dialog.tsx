"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUpRight, Repeat, X } from "lucide-react";
import {
  ALL_DAY,
  describeDays,
  describeDaysInline,
  entriesForDate,
  formatTimeRange,
  freeRangesOn,
  isAllDay,
  parseNewEntry,
  type AvailabilityEntry,
  type AvailabilityKind,
  type NewAvailabilityEntry,
} from "@/lib/availability";
import { createAvailabilityRequest, deleteAvailabilityRequest, type DeleteTarget } from "@/lib/availability-client";
import { parseDateOnly } from "@/lib/format";
import { FULL_WEEK_ORDER } from "@/lib/overlap";
import {
  checkboxClass,
  dangerBtn,
  KIND_DOT,
  KIND_LABEL,
  KIND_SELECTED,
  KINDS,
  primaryBtn,
  secondaryBtn,
  smallCaps,
} from "@/components/availability/theme";

/** What the popup opens on: a day, optionally prefilled with a time range or pointing at one of its entries. */
export interface DayRequest {
  /** New for every open, so the form starts fresh each time. */
  openId: number;
  date: string;
  startTime?: string;
  endTime?: string;
  /** Entries to point out — several when the clicked block joined touching times. */
  highlightIds?: string[];
}

interface DayDialogProps {
  request: DayRequest | null;
  today: string;
  entries: AvailabilityEntry[];
  onReplace: (entries: AvailabilityEntry[]) => void;
  onClose: () => void;
}

export function DayDialog({ request, today, entries, onReplace, onClose }: DayDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const open = request !== null;

  // The native <dialog> provides the backdrop, focus trapping and Escape-to-close.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      // The dialog itself has no padding, so a click that targets it landed on the backdrop.
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-label="Availability for the selected day"
      className="m-auto max-h-[92vh] w-[min(560px,calc(100vw-24px))] overflow-y-auto rounded-[14px] border border-[#dce1ce] bg-[#fffef7] p-0 text-[#183c30] shadow-[0_24px_60px_#183c3040] backdrop:bg-[#183c30]/40"
    >
      {request && (
        <div className="relative p-6 sm:p-8">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-[#697365] transition-colors hover:bg-[#edf0de] hover:text-[#183c30]"
          >
            <X size={18} />
          </button>
          <DayPanel
            key={request.openId}
            today={today}
            date={request.date}
            entries={entries}
            initialStartTime={request.startTime}
            initialEndTime={request.endTime}
            highlightIds={request.highlightIds}
            onReplace={onReplace}
            onAdded={onClose}
          />
        </div>
      )}
    </dialog>
  );
}

interface DayPanelProps {
  today: string;
  date: string;
  entries: AvailabilityEntry[];
  initialStartTime?: string;
  initialEndTime?: string;
  highlightIds?: string[];
  onReplace: (entries: AvailabilityEntry[]) => void;
  /** After a new time is saved (directly or by overriding a clash). */
  onAdded: () => void;
}

/** A new entry the server held back because it clashes, waiting on "Override" or "Discard". */
interface PendingClash {
  entry: NewAvailabilityEntry;
  conflicts: AvailabilityEntry[];
}

type DeleteScope = "day" | "all" | "range";

/** A repeating entry whose × was clicked, waiting on which of its days to delete. */
interface PendingDelete {
  entryId: string;
  scope: DeleteScope;
  /** "Choose days" bounds, "" when blank. */
  from: string;
  to: string;
}

function DayPanel({
  today,
  date,
  entries,
  initialStartTime,
  initialEndTime,
  highlightIds,
  onReplace,
  onAdded,
}: DayPanelProps) {
  const [kind, setKind] = useState<AvailabilityKind>("available");
  const [startTime, setStartTime] = useState(initialStartTime ?? "18:00");
  const [endTime, setEndTime] = useState(initialEndTime ?? "20:00");
  const [allDay, setAllDay] = useState(false);
  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [repeatStart, setRepeatStart] = useState("");
  const [repeatEnd, setRepeatEnd] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [clash, setClash] = useState<PendingClash | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const day = parseDateOnly(date);
  const weekday = day.getDay();
  const weekdayName = FULL_WEEK_ORDER[weekday];
  const monthName = day.toLocaleDateString("en-US", { month: "long" });
  const dayEntries = entriesForDate(entries, date);
  // Only worth spelling out when "can't play" entries are carving into "can play" ones.
  const showFreeSummary =
    dayEntries.some((e) => e.kind === "available") && dayEntries.some((e) => e.kind === "unavailable");
  const free = freeRangesOn(entries, date);

  async function save(entry: NewAvailabilityEntry, override: boolean) {
    setError("");
    setNotice("");
    setSubmitting(true);
    try {
      const result = await createAvailabilityRequest(entry, { today, override });
      if ("conflicts" in result) {
        setClash({ entry, conflicts: result.conflicts });
      } else {
        setClash(null);
        onReplace(result.entries);
        onAdded();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = parseNewEntry({
      kind,
      ...(allDay ? ALL_DAY : { startTime, endTime }),
      weekday: repeatWeekly ? weekday : null,
      // Blank repeat dates mean no start / no end: every week, indefinitely.
      startDate: repeatWeekly && repeatStart ? repeatStart : null,
      endDate: repeatWeekly && repeatEnd ? repeatEnd : null,
      date: repeatWeekly ? null : date,
    });
    if (typeof parsed === "string") {
      setNotice("");
      setError(parsed);
      return;
    }
    await save(parsed, false);
  }

  function discard() {
    setClash(null);
    setNotice("Kept your existing times. The new one wasn't saved.");
  }

  async function remove(entryId: string, target: DeleteTarget) {
    setDeleteError("");
    setNotice("");
    setClash(null);
    setRemovingId(entryId);
    try {
      onReplace(await deleteAvailabilityRequest(entryId, target, today));
      setPendingDelete(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setRemovingId(null);
    }
  }

  // A one-off goes straight away; a repeat first asks which of its days to delete.
  function handleRemoveClick(entry: AvailabilityEntry) {
    setDeleteError("");
    if (entry.weekday === null) {
      void remove(entry.id, { series: false });
      return;
    }
    setPendingDelete(pendingDelete?.entryId === entry.id ? null : { entryId: entry.id, scope: "day", from: date, to: "" });
  }

  async function confirmDelete(pending: PendingDelete) {
    if (pending.scope === "all") return remove(pending.entryId, { series: true });
    if (pending.scope === "day") return remove(pending.entryId, { from: date, to: date });
    if (!pending.from && !pending.to) {
      setDeleteError("Pick a start date, an end date, or both.");
      return;
    }
    if (pending.from && pending.to && pending.to < pending.from) {
      setDeleteError("The range can't end before it starts.");
      return;
    }
    await remove(pending.entryId, { from: pending.from || null, to: pending.to || null });
  }

  return (
    <div>
      <p className="pf-eyebrow">
        <span />
        {weekdayName.toUpperCase()}
      </p>
      <div className="mt-3 pr-10">
        <h2>
          {monthName} <em>{day.getDate()}</em>
        </h2>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-[#697365]">Add the times you can play, or can&apos;t.</p>

      {dayEntries.length === 0 ? (
        <p className="mt-6 rounded-[10px] border border-dashed border-[#dce1ce] px-4 py-5 text-sm text-[#697365]">
          Nothing set for this day yet.
        </p>
      ) : (
        <>
          <div className={`mt-6 flex justify-between ${smallCaps}`}>
            <span>On this day</span>
            <span>{String(dayEntries.length).padStart(2, "0")} set</span>
          </div>
          <ul className="mt-2 divide-y divide-[#dce1ce] border-t border-[#dce1ce]">
            {dayEntries.map((entry) => {
              const weekly = entry.weekday !== null;
              const removeLabel = weekly ? "Remove… (choose which days)" : "Remove";
              const openDelete = pendingDelete?.entryId === entry.id ? pendingDelete : null;
              return (
                <li
                  key={entry.id}
                  className={`py-3 ${highlightIds?.includes(entry.id) ? "-mx-3 rounded-[10px] bg-[#f6f9df] px-3" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${KIND_DOT[entry.kind]}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-[#183c30]">
                        <span className="font-semibold">{KIND_LABEL[entry.kind]}</span>
                        <span className="text-[#697365]"> · {formatTimeRange(entry.startTime, entry.endTime)}</span>
                      </p>
                      {weekly && (
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-[#697365]">
                          <Repeat className="h-3 w-3 shrink-0" />
                          {describeDays(entry)}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveClick(entry)}
                      disabled={removingId === entry.id}
                      aria-expanded={weekly ? openDelete !== null : undefined}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#697365] transition-colors hover:bg-[#edf0de] hover:text-[#a8432d] disabled:opacity-40"
                      aria-label={removeLabel}
                      title={removeLabel}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {openDelete && (
                    <DeleteRepeatPrompt
                      entry={entry}
                      date={date}
                      pending={openDelete}
                      onChange={setPendingDelete}
                      removing={removingId === entry.id}
                      onCancel={() => setPendingDelete(null)}
                      onConfirm={() => confirmDelete(openDelete)}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {deleteError && <p className="mt-2 text-sm text-[#a8432d]">{deleteError}</p>}

      {showFreeSummary && (
        <p className="mt-4 rounded-[10px] bg-[#edf0de] px-3.5 py-2.5 text-xs text-[#183c30]">
          <span className="font-semibold">Free to play:</span>{" "}
          {free.length > 0
            ? free.map((range, i) => (
                <span key={range.startTime} className="whitespace-nowrap">
                  {i > 0 && " · "}
                  {formatTimeRange(range.startTime, range.endTime)}
                </span>
              ))
            : "no time left"}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4 border-t border-[#dce1ce] pt-7">
        <p className="pf-eyebrow">ADD A TIME</p>

        <div className="grid grid-cols-2 gap-1 rounded-full border border-[#cdd4c2] bg-[#fffefb] p-1">
          {KINDS.map((k) => (
            <button
              type="button"
              key={k}
              onClick={() => setKind(k)}
              aria-pressed={kind === k}
              className={`rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
                kind === k ? KIND_SELECTED[k] : "text-[#697365] hover:text-[#183c30]"
              }`}
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm text-[#183c30]">
          <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className={checkboxClass} />
          All day
        </label>

        {!allDay && (
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="pf-auth-label">From</span>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="pf-auth-input"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="pf-auth-label">To</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="pf-auth-input"
              />
            </label>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-[#183c30]">
          <input
            type="checkbox"
            checked={repeatWeekly}
            onChange={(e) => setRepeatWeekly(e.target.checked)}
            className={checkboxClass}
          />
          Repeat every {weekdayName}
        </label>

        {repeatWeekly && (
          <div className="flex flex-col gap-2 rounded-[10px] bg-[#f2f4e8] p-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="pf-auth-label">Starting</span>
                <input
                  type="date"
                  value={repeatStart}
                  onChange={(e) => setRepeatStart(e.target.value)}
                  className="pf-auth-input"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="pf-auth-label">Until</span>
                <input
                  type="date"
                  value={repeatEnd}
                  min={repeatStart || undefined}
                  onChange={(e) => setRepeatEnd(e.target.value)}
                  className="pf-auth-input"
                />
              </label>
            </div>
            <p className="text-xs text-[#697365]">Optional. Leave blank to repeat every {weekdayName} with no end.</p>
          </div>
        )}

        {error && <p className="text-sm text-[#a8432d]">{error}</p>}
        {notice && <p className="text-sm text-[#697365]">{notice}</p>}

        {clash ? (
          <ClashPrompt clash={clash} submitting={submitting} onOverride={() => save(clash.entry, true)} onDiscard={discard} />
        ) : (
          <button type="submit" disabled={submitting} className={`mt-2 w-full justify-between ${primaryBtn}`}>
            {submitting ? "Adding…" : "Add"}
            <ArrowUpRight size={18} />
          </button>
        )}
      </form>
    </div>
  );
}

interface ClashPromptProps {
  clash: PendingClash;
  submitting: boolean;
  onOverride: () => void;
  onDiscard: () => void;
}

function ClashPrompt({ clash, submitting, onOverride, onDiscard }: ClashPromptProps) {
  const { entry, conflicts } = clash;
  const newTime = isAllDay(entry) ? "all day" : formatTimeRange(entry.startTime, entry.endTime);
  return (
    <div role="alert" className="rounded-[10px] border border-[#cfdc8a] bg-[#f6f9df] p-4">
      <p className="text-sm font-semibold text-[#183c30]">Uh-oh, there is overlaps with times you&apos;ve already set!</p>

      <ul className="mt-3 flex flex-col gap-2">
        {conflicts.map((c) => (
          <li key={c.id} className="flex items-start gap-2">
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${KIND_DOT[c.kind]}`} />
            <div className="min-w-0">
              <p className="text-sm text-[#183c30]">
                <span className="font-semibold">{KIND_LABEL[c.kind]}</span>
                <span className="text-[#697365]"> · {formatTimeRange(c.startTime, c.endTime)}</span>
              </p>
              <p className="text-xs text-[#697365]">{describeDays(c)}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-col gap-1 text-xs text-[#4f5b4e]">
        <p>
          <span className="font-semibold text-[#183c30]">Override:</span>{" "}
          {`${KIND_LABEL[entry.kind]} ${newTime} ${describeDaysInline(entry)}.`}
        </p>
        <p>
          <span className="font-semibold text-[#183c30]">Discard:</span>{" "}
          Don&apos;t save this new availability.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={onDiscard} disabled={submitting} className={secondaryBtn}>
          Discard
        </button>
        <button type="button" onClick={onOverride} disabled={submitting} className={`justify-center ${primaryBtn}`}>
          {submitting ? "Saving…" : "Override"}
        </button>
      </div>
    </div>
  );
}

interface DeleteRepeatPromptProps {
  entry: AvailabilityEntry;
  /** The day the popup is open on — what "only this day" means. */
  date: string;
  pending: PendingDelete;
  onChange: (pending: PendingDelete) => void;
  removing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function DeleteRepeatPrompt({ entry, date, pending, onChange, removing, onCancel, onConfirm }: DeleteRepeatPromptProps) {
  const weekdayName = FULL_WEEK_ORDER[entry.weekday as number];
  const options: { scope: DeleteScope; label: string }[] = [
    {
      scope: "day",
      label: `Only ${parseDateOnly(date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`,
    },
    { scope: "all", label: `${describeDays(entry)} (the whole repeat)` },
    { scope: "range", label: "Choose days" },
  ];

  return (
    <div className="mt-3 flex flex-col gap-3 rounded-[10px] border border-[#dce1ce] bg-[#f7f7ef] p-4">
      <p className="text-sm font-semibold text-[#183c30]">Delete this repeating time?</p>

      <div role="radiogroup" aria-label="Which days to delete" className="flex flex-col gap-2">
        {options.map((option) => (
          <label key={option.scope} className="flex items-center gap-2 text-sm text-[#183c30]">
            <input
              type="radio"
              name={`delete-${entry.id}`}
              checked={pending.scope === option.scope}
              onChange={() => onChange({ ...pending, scope: option.scope })}
              className={checkboxClass}
            />
            {option.label}
          </label>
        ))}
      </div>

      {pending.scope === "range" && (
        <div className="flex flex-col gap-2">
          {/* Stacked on phones: nested this deep, two date inputs side by side get clipped. */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="pf-auth-label">From</span>
              <input
                type="date"
                value={pending.from}
                onChange={(e) => onChange({ ...pending, from: e.target.value })}
                className="pf-auth-input"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="pf-auth-label">Until</span>
              <input
                type="date"
                value={pending.to}
                min={pending.from || undefined}
                onChange={(e) => onChange({ ...pending, to: e.target.value })}
                className="pf-auth-input"
              />
            </label>
          </div>
          <p className="text-xs text-[#697365]">Leave Until blank to remove every {weekdayName} from then on.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onCancel} disabled={removing} className={secondaryBtn}>
          Cancel
        </button>
        <button type="button" onClick={onConfirm} disabled={removing} className={dangerBtn}>
          {removing ? "Deleting…" : "Delete"}
        </button>
      </div>
    </div>
  );
}
