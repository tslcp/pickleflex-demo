"use client";

import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { ChevronLeft, ChevronRight, Repeat, X } from "lucide-react";
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
import { createAvailabilityRequest, deleteAvailabilityRequest, fetchAvailability } from "@/lib/availability-client";
import { parseDateOnly, toDateOnly } from "@/lib/format";
import { FULL_WEEK_ORDER } from "@/lib/overlap";

const inputClass =
  "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";
const neutralBtn =
  "inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50";
const emeraldBtn =
  "inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-300";
const dangerBtn =
  "inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-zinc-300";
const monthNavBtn =
  "rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:text-zinc-300 disabled:hover:bg-transparent";

const KINDS: AvailabilityKind[] = ["available", "unavailable"];
const KIND_LABEL: Record<AvailabilityKind, string> = { available: "Can play", unavailable: "Can't play" };
const KIND_DOT: Record<AvailabilityKind, string> = { available: "bg-emerald-500", unavailable: "bg-red-400" };
const KIND_SELECTED: Record<AvailabilityKind, string> = {
  available: "bg-emerald-50 text-emerald-700",
  unavailable: "bg-red-50 text-red-700",
};

function subscribeNever() {
  return () => {};
}

// "Today" depends on the viewer's timezone, so it's only read in the browser —
// the server snapshot is null and the page shows its loading state until then.
function useToday(): string | null {
  return useSyncExternalStore(subscribeNever, () => toDateOnly(new Date()), () => null);
}

/** "2026-10" shifted by `delta` months. */
function shiftMonth(month: string, delta: number): string {
  const first = parseDateOnly(`${month}-01`);
  return toDateOnly(new Date(first.getFullYear(), first.getMonth() + delta, 1)).slice(0, 7);
}

export function MyAvailability() {
  const today = useToday();
  const [entries, setEntries] = useState<AvailabilityEntry[] | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    fetchAvailability()
      .then(setEntries)
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Failed to load availability."));
  }, []);

  if (loadError) return <p className="text-sm text-red-600">{loadError}</p>;
  if (!today || !entries) return <p className="text-sm text-zinc-500">Loading availability…</p>;

  return <AvailabilityPlanner today={today} entries={entries} onReplace={setEntries} />;
}

interface PlannerProps {
  today: string;
  entries: AvailabilityEntry[];
  onReplace: (entries: AvailabilityEntry[]) => void;
}

function AvailabilityPlanner({ today, entries, onReplace }: PlannerProps) {
  const [selectedDate, setSelectedDate] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));

  return (
    <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[20rem_1fr] lg:items-start">
      <MiniCalendar
        today={today}
        month={month}
        onMonthChange={setMonth}
        selectedDate={selectedDate}
        onSelect={setSelectedDate}
        entries={entries}
      />
      <DayPanel today={today} date={selectedDate} entries={entries} onReplace={onReplace} />
    </div>
  );
}

interface MiniCalendarProps {
  today: string;
  month: string;
  onMonthChange: (month: string) => void;
  selectedDate: string;
  onSelect: (date: string) => void;
  entries: AvailabilityEntry[];
}

function MiniCalendar({ today, month, onMonthChange, selectedDate, onSelect, entries }: MiniCalendarProps) {
  const first = parseDateOnly(`${month}-01`);
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const dates = Array.from({ length: daysInMonth }, (_, i) =>
    toDateOnly(new Date(first.getFullYear(), first.getMonth(), i + 1)),
  );
  const label = first.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-zinc-900">{label}</p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onMonthChange(shiftMonth(month, -1))}
            disabled={month <= today.slice(0, 7)}
            className={monthNavBtn}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onMonthChange(shiftMonth(month, 1))}
            className={monthNavBtn}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center">
        {FULL_WEEK_ORDER.map((day) => (
          <span key={day} title={day} className="pb-1 text-xs font-medium text-zinc-400">
            {day.slice(0, 2)}
          </span>
        ))}
        {/* Blank cells push the 1st under its weekday column. */}
        {Array.from({ length: first.getDay() }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {dates.map((date) => {
          const past = date < today;
          const selected = date === selectedDate;
          const blocked = past ? [] : entriesForDate(entries, date).filter((e) => e.kind === "unavailable");
          const hasFree = !past && freeRangesOn(entries, date).length > 0;
          const blockedAllDay = blocked.some(isAllDay);
          return (
            <button
              type="button"
              key={date}
              onClick={() => onSelect(date)}
              disabled={past}
              aria-pressed={selected}
              aria-label={parseDateOnly(date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              className={`flex h-10 flex-col items-center justify-center gap-0.5 rounded-lg text-sm transition-colors ${
                selected
                  ? "bg-emerald-600 font-semibold text-white"
                  : past
                    ? "cursor-not-allowed text-zinc-300"
                    : date === today
                      ? "font-semibold text-emerald-600 hover:bg-zinc-100"
                      : "text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              <span className={blockedAllDay ? "line-through decoration-red-400 decoration-2" : undefined}>
                {Number(date.slice(8))}
              </span>
              <span className="flex h-1 gap-0.5">
                {hasFree && <span className={`h-1 w-1 rounded-full ${selected ? "bg-white" : KIND_DOT.available}`} />}
                {blocked.length > 0 && <span className={`h-1 w-1 rounded-full ${selected ? "bg-red-200" : KIND_DOT.unavailable}`} />}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex gap-4 border-t border-zinc-100 pt-4 text-xs text-zinc-500">
        {KINDS.map((kind) => (
          <span key={kind} className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${KIND_DOT[kind]}`} />
            {KIND_LABEL[kind]}
          </span>
        ))}
      </div>
    </div>
  );
}

interface DayPanelProps {
  today: string;
  date: string;
  entries: AvailabilityEntry[];
  onReplace: (entries: AvailabilityEntry[]) => void;
}

/** A new entry the server held back because it clashes, waiting on "Override" or "Discard". */
interface PendingClash {
  /** The date it was added on, so the prompt doesn't follow the user to other days. */
  forDate: string;
  entry: NewAvailabilityEntry;
  conflicts: AvailabilityEntry[];
}

type DeleteScope = "day" | "all" | "range";

/** A repeating entry whose × was clicked, waiting on which of its days to delete. */
interface PendingDelete {
  entryId: string;
  /** The date it was opened on — what "only this day" means, and where the prompt shows. */
  forDate: string;
  scope: DeleteScope;
  /** "Choose days" bounds, "" when blank. */
  from: string;
  to: string;
}

function DayPanel({ today, date, entries, onReplace }: DayPanelProps) {
  const [kind, setKind] = useState<AvailabilityKind>("available");
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("20:00");
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

  const weekday = parseDateOnly(date).getDay();
  const weekdayName = FULL_WEEK_ORDER[weekday];
  const heading = parseDateOnly(date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const dayEntries = entriesForDate(entries, date);
  // Only worth spelling out when "can't play" entries are carving into "can play" ones.
  const showFreeSummary =
    dayEntries.some((e) => e.kind === "available") && dayEntries.some((e) => e.kind === "unavailable");
  const free = freeRangesOn(entries, date);
  const openClash = clash?.forDate === date ? clash : null;

  async function save(entry: NewAvailabilityEntry, override: boolean) {
    setError("");
    setNotice("");
    setSubmitting(true);
    try {
      const result = await createAvailabilityRequest(entry, { today, override });
      if ("conflicts" in result) {
        setClash({ forDate: date, entry, conflicts: result.conflicts });
      } else {
        setClash(null);
        onReplace(result.entries);
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

  async function remove(entryId: string, days?: { from: string | null; to: string | null }) {
    setDeleteError("");
    setNotice("");
    setClash(null);
    setRemovingId(entryId);
    try {
      onReplace(await deleteAvailabilityRequest(entryId, days));
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
      void remove(entry.id);
      return;
    }
    const isOpen = pendingDelete?.entryId === entry.id && pendingDelete.forDate === date;
    setPendingDelete(isOpen ? null : { entryId: entry.id, forDate: date, scope: "day", from: date, to: "" });
  }

  async function confirmDelete(pending: PendingDelete) {
    if (pending.scope === "all") return remove(pending.entryId);
    if (pending.scope === "day") return remove(pending.entryId, { from: pending.forDate, to: pending.forDate });
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
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
      <h2 className="text-lg font-semibold text-zinc-900">{heading}</h2>
      <p className="mt-1 text-sm text-zinc-500">Add the times you can play, or can&apos;t.</p>

      {dayEntries.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-400">Nothing set for this day yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-zinc-100">
          {dayEntries.map((entry) => {
            const weekly = entry.weekday !== null;
            const removeLabel = weekly ? "Remove… (choose which days)" : "Remove";
            const openDelete =
              pendingDelete?.entryId === entry.id && pendingDelete.forDate === date ? pendingDelete : null;
            return (
              <li key={entry.id} className="py-2.5">
                <div className="flex items-center gap-3">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${KIND_DOT[entry.kind]}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-zinc-900">
                      <span className="font-medium">{KIND_LABEL[entry.kind]}</span>
                      <span className="text-zinc-500"> · {formatTimeRange(entry.startTime, entry.endTime)}</span>
                    </p>
                    {weekly && (
                      <p className="flex items-center gap-1 text-xs text-zinc-400">
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
                    className="shrink-0 rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-red-500 disabled:opacity-40"
                    aria-label={removeLabel}
                    title={removeLabel}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {openDelete && (
                  <DeleteRepeatPrompt
                    entry={entry}
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
      )}

      {deleteError && <p className="mt-2 text-sm text-red-600">{deleteError}</p>}

      {showFreeSummary && (
        <p className="mt-3 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
          <span className="font-medium text-zinc-700">Free to play:</span>{" "}
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

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4 border-t border-zinc-100 pt-6">
        <div className="grid grid-cols-2 gap-1 rounded-lg border border-zinc-200 p-1">
          {KINDS.map((k) => (
            <button
              type="button"
              key={k}
              onClick={() => setKind(k)}
              aria-pressed={kind === k}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                kind === k ? KIND_SELECTED[k] : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
            className="h-4 w-4 accent-emerald-600"
          />
          All day
        </label>

        {!allDay && (
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-zinc-700">From</span>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-zinc-700">To</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className={inputClass}
              />
            </label>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={repeatWeekly}
            onChange={(e) => setRepeatWeekly(e.target.checked)}
            className="h-4 w-4 accent-emerald-600"
          />
          Repeat every {weekdayName}
        </label>

        {repeatWeekly && (
          <div className="flex flex-col gap-2 rounded-lg bg-zinc-50 p-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-zinc-700">Starting</span>
                <input
                  type="date"
                  value={repeatStart}
                  onChange={(e) => setRepeatStart(e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-zinc-700">Until</span>
                <input
                  type="date"
                  value={repeatEnd}
                  min={repeatStart || undefined}
                  onChange={(e) => setRepeatEnd(e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
            <p className="text-xs text-zinc-500">Optional. Leave blank to repeat every {weekdayName} with no end.</p>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        {notice && <p className="text-sm text-zinc-500">{notice}</p>}

        {openClash ? (
          <ClashPrompt
            clash={openClash}
            submitting={submitting}
            onOverride={() => save(openClash.entry, true)}
            onDiscard={discard}
          />
        ) : (
          <button type="submit" disabled={submitting} className={`mt-2 ${emeraldBtn}`}>
            {submitting ? "Adding…" : "Add"}
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
    <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-medium text-amber-800">Uh-oh, there is overlaps with times you&apos;ve already set!</p>

      <ul className="mt-3 flex flex-col gap-2">
        {conflicts.map((c) => (
          <li key={c.id} className="flex items-start gap-2">
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${KIND_DOT[c.kind]}`} />
            <div className="min-w-0">
              <p className="text-sm text-zinc-900">
                <span className="font-medium">{KIND_LABEL[c.kind]}</span>
                <span className="text-zinc-500"> · {formatTimeRange(c.startTime, c.endTime)}</span>
              </p>
              <p className="text-xs text-zinc-500">{describeDays(c)}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-col gap-1 text-xs text-zinc-600">
        <p>
          <span className="font-medium text-zinc-700">Override:</span>{" "}
          {`${KIND_LABEL[entry.kind]} ${newTime} ${describeDaysInline(entry)}.`}
        </p>
        <p>
          <span className="font-medium text-zinc-700">Discard:</span>{" "}
          Don&apos;t save this new availability.
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={onDiscard} disabled={submitting} className={neutralBtn}>
          Discard
        </button>
        <button type="button" onClick={onOverride} disabled={submitting} className={emeraldBtn}>
          {submitting ? "Saving…" : "Override"}
        </button>
      </div>
    </div>
  );
}

interface DeleteRepeatPromptProps {
  entry: AvailabilityEntry;
  pending: PendingDelete;
  onChange: (pending: PendingDelete) => void;
  removing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function DeleteRepeatPrompt({ entry, pending, onChange, removing, onCancel, onConfirm }: DeleteRepeatPromptProps) {
  const weekdayName = FULL_WEEK_ORDER[entry.weekday as number];
  const options: { scope: DeleteScope; label: string }[] = [
    {
      scope: "day",
      label: `Only ${parseDateOnly(pending.forDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`,
    },
    { scope: "all", label: `${describeDays(entry)} (the whole repeat)` },
    { scope: "range", label: "Choose days" },
  ];

  return (
    <div className="mt-2.5 flex flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-sm font-medium text-zinc-900">Delete this repeating time?</p>

      <div role="radiogroup" aria-label="Which days to delete" className="flex flex-col gap-2">
        {options.map((option) => (
          <label key={option.scope} className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="radio"
              name={`delete-${entry.id}`}
              checked={pending.scope === option.scope}
              onChange={() => onChange({ ...pending, scope: option.scope })}
              className="h-4 w-4 shrink-0 accent-emerald-600"
            />
            {option.label}
          </label>
        ))}
      </div>

      {pending.scope === "range" && (
        <div className="flex flex-col gap-2">
          {/* Stacked on phones: nested this deep, two date inputs side by side get clipped. */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-zinc-700">From</span>
              <input
                type="date"
                value={pending.from}
                onChange={(e) => onChange({ ...pending, from: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-zinc-700">Until</span>
              <input
                type="date"
                value={pending.to}
                min={pending.from || undefined}
                onChange={(e) => onChange({ ...pending, to: e.target.value })}
                className={inputClass}
              />
            </label>
          </div>
          <p className="text-xs text-zinc-500">Leave Until blank to remove every {weekdayName} from then on.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onCancel} disabled={removing} className={neutralBtn}>
          Cancel
        </button>
        <button type="button" onClick={onConfirm} disabled={removing} className={dangerBtn}>
          {removing ? "Deleting…" : "Delete"}
        </button>
      </div>
    </div>
  );
}
