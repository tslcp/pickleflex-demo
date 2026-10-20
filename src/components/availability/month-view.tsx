"use client";

import { formatTimeRange, freeRangesOn, type AvailabilityEntry } from "@/lib/availability";
import { parseDateOnly } from "@/lib/format";
import { FULL_WEEK_ORDER } from "@/lib/overlap";
import { entriesShownOn, mergeIntoBlocks, monthGridDates, shortRange } from "@/components/availability/calendar-utils";
import { KIND_CHIP, KIND_DOT, KIND_LABEL, smallCaps } from "@/components/availability/theme";

/** Chips shown per day before collapsing the rest into "+N more". */
const MAX_CHIPS = 3;

interface MonthViewProps {
  today: string;
  /** "YYYY-MM". */
  month: string;
  entries: AvailabilityEntry[];
  onOpenDay: (date: string, highlightIds?: string[]) => void;
}

export function MonthView({ today, month, entries, onOpenDay }: MonthViewProps) {
  const dates = monthGridDates(month);
  const lastRowStart = dates.length - 7;

  return (
    <div className="overflow-hidden rounded-[14px] border border-[#dce1ce] bg-[#fffef7]">
      <div className="grid grid-cols-7 border-b border-[#dce1ce]">
        {FULL_WEEK_ORDER.map((day) => (
          <div key={day} title={day} className={`py-2.5 text-center ${smallCaps}`}>
            <span className="sm:hidden">{day.slice(0, 1)}</span>
            <span className="hidden sm:inline">{day.slice(0, 3)}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {dates.map((date, i) => (
          <MonthCell
            key={date}
            date={date}
            today={today}
            inMonth={date.startsWith(month)}
            entries={entries}
            lastColumn={i % 7 === 6}
            lastRow={i >= lastRowStart}
            onOpenDay={onOpenDay}
          />
        ))}
      </div>
    </div>
  );
}

interface MonthCellProps {
  date: string;
  today: string;
  inMonth: boolean;
  entries: AvailabilityEntry[];
  lastColumn: boolean;
  lastRow: boolean;
  onOpenDay: (date: string, highlightIds?: string[]) => void;
}

function MonthCell({ date, today, inMonth, entries, lastColumn, lastRow, onOpenDay }: MonthCellProps) {
  const past = date < today;
  const dayEntries = entriesShownOn(entries, date, today);
  // Touching or overlapping times of the same kind show as one chip, as in the week view.
  const blocks = mergeIntoBlocks(dayEntries);
  const visible = blocks.slice(0, MAX_CHIPS);
  const hiddenCount = blocks.length - visible.length;
  const hasFree = freeRangesOn(entries, date).length > 0;
  const hasBlocked = dayEntries.some((e) => e.kind === "unavailable");
  const longDate = parseDateOnly(date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div
      // The whole cell opens the day, like clicking an empty spot in Google Calendar;
      // the date button below is the keyboard-reachable way to do the same.
      onClick={past ? undefined : () => onOpenDay(date)}
      className={`min-h-[62px] p-1 sm:min-h-[118px] sm:p-1.5 ${lastColumn ? "" : "border-r"} ${lastRow ? "" : "border-b"} border-[#dce1ce] ${
        past ? "bg-[#183c30]/[0.03]" : "cursor-pointer transition-colors hover:bg-[#f6f9df]"
      }`}
    >
      <div className="flex justify-center sm:justify-start">
        <button
          type="button"
          disabled={past}
          onClick={(e) => {
            e.stopPropagation();
            onOpenDay(date);
          }}
          aria-label={`${longDate}${dayEntries.length ? `, ${dayEntries.length} set` : ""}`}
          className={`grid h-7 w-7 place-items-center rounded-full text-[13px] transition-colors ${
            date === today
              ? "bg-[#183c30] font-bold text-[#deef8a]"
              : past || !inMonth
                ? "text-[#183c30]/35"
                : "text-[#183c30] hover:bg-[#edf0de]"
          }`}
        >
          {Number(date.slice(8))}
        </button>
      </div>

      {/* Phones: just dots — tap the day to see its times. */}
      {!past && (hasFree || hasBlocked) && (
        <div className="mt-1 flex justify-center gap-0.5 sm:hidden">
          {hasFree && <span className={`h-1.5 w-1.5 rounded-full ${KIND_DOT.available}`} />}
          {hasBlocked && <span className={`h-1.5 w-1.5 rounded-full ${KIND_DOT.unavailable}`} />}
        </div>
      )}

      <div className="mt-1 hidden flex-col gap-0.5 sm:flex">
        {visible.map((block) => (
          <button
            type="button"
            key={block.entryIds.join()}
            disabled={past}
            onClick={(e) => {
              e.stopPropagation();
              onOpenDay(date, block.entryIds);
            }}
            aria-label={`${KIND_LABEL[block.kind]} ${formatTimeRange(block.startTime, block.endTime)}, ${longDate}`}
            className={`flex w-full min-w-0 items-center gap-1 rounded-[4px] px-1.5 py-[3px] text-left text-[11px] leading-tight ${KIND_CHIP[block.kind]} ${
              past ? "opacity-50" : "transition hover:brightness-95"
            }`}
          >
            <span className="shrink-0 font-semibold">{shortRange(block)}</span>
            <span className="truncate">{KIND_LABEL[block.kind]}</span>
          </button>
        ))}
        {hiddenCount > 0 && (
          <button
            type="button"
            disabled={past}
            onClick={(e) => {
              e.stopPropagation();
              onOpenDay(date);
            }}
            className="px-1.5 text-left text-[11px] font-semibold text-[#697365] hover:text-[#183c30]"
          >
            +{hiddenCount} more
          </button>
        )}
      </div>
    </div>
  );
}
