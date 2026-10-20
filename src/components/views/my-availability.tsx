"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import type { AvailabilityEntry } from "@/lib/availability";
import { fetchAvailability } from "@/lib/availability-client";
import { parseDateOnly, toDateOnly } from "@/lib/format";
import { addDays, shiftMonth, startOfWeek } from "@/components/availability/calendar-utils";
import { DayDialog, type DayRequest } from "@/components/availability/day-dialog";
import { MonthView } from "@/components/availability/month-view";
import { KIND_DOT, KIND_LABEL, KINDS, roundBtn, smallCaps } from "@/components/availability/theme";
import { WeekView } from "@/components/availability/week-view";

type View = "month" | "week";

const VIEWS: { view: View; label: string }[] = [
  { view: "month", label: "Month" },
  { view: "week", label: "Week" },
];

function subscribeNever() {
  return () => {};
}

// "Today" depends on the viewer's timezone, so it's only read in the browser —
// the server snapshot is null and the page shows its loading state until then.
function useToday(): string | null {
  return useSyncExternalStore(subscribeNever, () => toDateOnly(new Date()), () => null);
}

/** Gives the page the homepage's look; globals.css turns the surrounding main area paper-coloured too. */
function Themed({ children }: { children: ReactNode }) {
  return <div className="pf-home pf-availability">{children}</div>;
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

  if (loadError) {
    return (
      <Themed>
        <p className="text-sm text-[#a8432d]">{loadError}</p>
      </Themed>
    );
  }
  if (!today || !entries) {
    return (
      <Themed>
        <p className="text-sm text-[#697365]">Loading availability…</p>
      </Themed>
    );
  }

  return (
    <Themed>
      <AvailabilityCalendar today={today} entries={entries} onReplace={setEntries} />
    </Themed>
  );
}

/** "Oct 18 – 24", "Oct 25 – Nov 1" (the year is shown separately). */
function weekRangeLabel(weekStart: string): string {
  const start = parseDateOnly(weekStart);
  const end = parseDateOnly(addDays(weekStart, 6));
  const startMonth = start.toLocaleDateString("en-US", { month: "short" });
  const endMonth = end.toLocaleDateString("en-US", { month: "short" });
  return startMonth === endMonth
    ? `${startMonth} ${start.getDate()} – ${end.getDate()}`
    : `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}`;
}

interface CalendarProps {
  today: string;
  entries: AvailabilityEntry[];
  onReplace: (entries: AvailabilityEntry[]) => void;
}

function AvailabilityCalendar({ today, entries, onReplace }: CalendarProps) {
  const [view, setView] = useState<View>("month");
  // Any date inside the month or week on screen.
  const [anchor, setAnchor] = useState(today);
  const [request, setRequest] = useState<DayRequest | null>(null);

  const month = anchor.slice(0, 7);
  const weekStart = startOfWeek(anchor);
  // Like the old mini calendar, don't page back into weeks/months that are entirely past.
  const canGoBack = view === "month" ? month > today.slice(0, 7) : weekStart > startOfWeek(today);
  const titleDate = parseDateOnly(view === "month" ? `${month}-01` : addDays(weekStart, 6));
  const title =
    view === "month" ? titleDate.toLocaleDateString("en-US", { month: "long" }) : `${weekRangeLabel(weekStart)},`;

  function step(delta: number) {
    setAnchor(view === "month" ? `${shiftMonth(month, delta)}-01` : addDays(weekStart, delta * 7));
  }

  function openDay(date: string, extra: Omit<DayRequest, "openId" | "date"> = {}) {
    setRequest({ openId: Date.now(), date, ...extra });
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
        <button
          type="button"
          onClick={() => setAnchor(today)}
          className="inline-flex h-[34px] items-center rounded-[5px] border border-[#183c3040] px-4 text-sm text-[#183c30] transition-colors hover:bg-[#f0f3e4]"
        >
          Today
        </button>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={!canGoBack}
            className={roundBtn}
            aria-label={view === "month" ? "Previous month" : "Previous week"}
          >
            <ArrowLeft size={15} />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            className={roundBtn}
            aria-label={view === "month" ? "Next month" : "Next week"}
          >
            <ArrowRight size={15} />
          </button>
        </div>
        <h2 aria-live="polite">
          {title} <em>{titleDate.getFullYear()}</em>
        </h2>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => openDay(anchor < today ? today : anchor)}
            className="inline-flex h-[38px] items-center gap-2 rounded-[5px] bg-[#183c30] px-4 text-sm text-white transition-colors hover:bg-[#315840]"
          >
            <Plus size={16} />
            Add time
          </button>
          <div role="group" aria-label="Calendar view" className="flex rounded-full border border-[#cdd4c2] bg-[#fffefb] p-1">
            {VIEWS.map((option) => (
              <button
                type="button"
                key={option.view}
                onClick={() => setView(option.view)}
                aria-pressed={view === option.view}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                  view === option.view ? "bg-[#183c30] text-[#deef8a]" : "text-[#697365] hover:text-[#183c30]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 ${smallCaps}`}>
        {KINDS.map((kind) => (
          <span key={kind} className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${KIND_DOT[kind]}`} />
            {KIND_LABEL[kind]}
          </span>
        ))}
        <span className="normal-case tracking-normal">
          {view === "month" ? "Click a day to add or edit times." : "Click or drag on the grid to add a time."}
        </span>
      </div>

      <div className="mt-3">
        {view === "month" ? (
          <MonthView today={today} month={month} entries={entries} onOpenDay={(date, highlightIds) => openDay(date, { highlightIds })} />
        ) : (
          <WeekView
            today={today}
            weekStart={weekStart}
            entries={entries}
            onOpenDay={(date, highlightIds) => openDay(date, { highlightIds })}
            onCreate={(date, startTime, endTime) => openDay(date, { startTime, endTime })}
          />
        )}
      </div>

      <DayDialog
        request={request}
        today={today}
        entries={entries}
        onReplace={onReplace}
        onClose={() => setRequest(null)}
      />
    </div>
  );
}
