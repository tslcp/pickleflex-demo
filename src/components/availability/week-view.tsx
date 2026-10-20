"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent } from "react";
import { formatTimeRange, isAllDay, type AvailabilityEntry } from "@/lib/availability";
import { parseDateOnly } from "@/lib/format";
import { FULL_WEEK_ORDER } from "@/lib/overlap";
import {
  addDays,
  entriesShownOn,
  hourLabel,
  HOUR_HEIGHT,
  layoutBlocks,
  mergeIntoBlocks,
  minutesOf,
  timeOf,
  type DayBlock,
} from "@/components/availability/calendar-utils";
import { KIND_CHIP, KIND_LABEL, smallCaps } from "@/components/availability/theme";

/** Drag-to-create snaps to this many minutes, like Google Calendar's 15-minute grid. */
const SNAP = 15;
const GRID_COLUMNS = "grid-cols-[52px_repeat(7,minmax(0,1fr))]";
const HOUR_LINES = `repeating-linear-gradient(to bottom, transparent 0, transparent ${HOUR_HEIGHT - 1}px, #e6eadb ${HOUR_HEIGHT - 1}px, #e6eadb ${HOUR_HEIGHT}px)`;

function subscribeEveryHalfMinute(onChange: () => void) {
  const timer = window.setInterval(onChange, 30_000);
  return () => window.clearInterval(timer);
}

/** Minutes since local midnight, for the "now" line; null while rendering on the server. */
function useNowMinutes(): number | null {
  return useSyncExternalStore(
    subscribeEveryHalfMinute,
    () => {
      const now = new Date();
      return now.getHours() * 60 + now.getMinutes();
    },
    () => null,
  );
}

interface WeekViewProps {
  today: string;
  /** The Sunday the week starts on. */
  weekStart: string;
  entries: AvailabilityEntry[];
  onOpenDay: (date: string, highlightIds?: string[]) => void;
  onCreate: (date: string, startTime: string, endTime: string) => void;
}

export function WeekView({ today, weekStart, entries, onOpenDay, onCreate }: WeekViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const nowMinutes = useNowMinutes();
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    return { date, blocks: mergeIntoBlocks(entriesShownOn(entries, date, today)) };
  });

  // Open each week scrolled to the morning rather than midnight, like Google Calendar.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 6.5 * HOUR_HEIGHT;
  }, [weekStart]);

  return (
    <div className="overflow-hidden rounded-[14px] border border-[#dce1ce] bg-[#fffef7]">
      <div className={`grid ${GRID_COLUMNS} border-b border-[#dce1ce]`}>
        <div />
        {days.map(({ date }) => {
          const past = date < today;
          const day = parseDateOnly(date);
          return (
            <button
              type="button"
              key={date}
              disabled={past}
              onClick={() => onOpenDay(date)}
              aria-label={day.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              className="group flex flex-col items-center gap-1 py-2.5 disabled:cursor-default"
            >
              <span className={smallCaps}>
                <span className="sm:hidden">{FULL_WEEK_ORDER[day.getDay()].slice(0, 1)}</span>
                <span className="hidden sm:inline">{FULL_WEEK_ORDER[day.getDay()].slice(0, 3)}</span>
              </span>
              <span
                className={`grid h-8 w-8 place-items-center rounded-full text-base sm:h-9 sm:w-9 sm:text-lg ${
                  date === today
                    ? "bg-[#183c30] font-bold text-[#deef8a]"
                    : past
                      ? "text-[#183c30]/35"
                      : "text-[#183c30] group-hover:bg-[#edf0de]"
                }`}
              >
                {day.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      <div ref={scrollRef} className="max-h-[min(640px,68vh)] overflow-y-auto">
        <div className={`relative grid ${GRID_COLUMNS}`} style={{ height: 24 * HOUR_HEIGHT }}>
          <div className="relative">
            {Array.from({ length: 23 }, (_, i) => i + 1).map((hour) => (
              <span
                key={hour}
                className="absolute right-2 -translate-y-1/2 whitespace-nowrap text-[10px] text-[#697365]"
                style={{ top: hour * HOUR_HEIGHT }}
              >
                {hourLabel(hour)}
              </span>
            ))}
          </div>
          {days.map(({ date, blocks }) => (
            <DayColumn
              key={date}
              date={date}
              today={today}
              blocks={blocks}
              nowMinutes={date === today ? nowMinutes : null}
              onOpenDay={onOpenDay}
              onCreate={onCreate}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface Drag {
  pointerId: number;
  /** Only a mouse drags out a range; a touch tap just picks a slot (touch is for scrolling). */
  isMouse: boolean;
  startY: number;
  anchor: number;
  current: number;
  moved: boolean;
}

interface DayColumnProps {
  date: string;
  today: string;
  blocks: DayBlock[];
  nowMinutes: number | null;
  onOpenDay: (date: string, highlightIds?: string[]) => void;
  onCreate: (date: string, startTime: string, endTime: string) => void;
}

function DayColumn({ date, today, blocks, nowMinutes, onOpenDay, onCreate }: DayColumnProps) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const past = date < today;

  function minutesAt(e: PointerEvent<HTMLDivElement>, round: (n: number) => number) {
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
    return Math.min(Math.max(round(((y / HOUR_HEIGHT) * 60) / SNAP) * SNAP, 0), 24 * 60);
  }

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    if (past || e.button !== 0 || (e.target as HTMLElement).closest("[data-block]")) return;
    const isMouse = e.pointerType === "mouse";
    if (isMouse) {
      e.currentTarget.setPointerCapture(e.pointerId);
      e.preventDefault(); // no text selection while dragging
    }
    const anchor = minutesAt(e, Math.floor);
    setDrag({ pointerId: e.pointerId, isMouse, startY: e.clientY, anchor, current: anchor + SNAP, moved: false });
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!drag?.isMouse || e.pointerId !== drag.pointerId) return;
    const moved = drag.moved || Math.abs(e.clientY - drag.startY) > 4;
    setDrag({ ...drag, current: minutesAt(e, Math.round), moved });
  }

  function handlePointerUp(e: PointerEvent<HTMLDivElement>) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    setDrag(null);
    let start: number;
    let end: number;
    if (drag.moved) {
      start = Math.min(drag.anchor, drag.current);
      end = Math.max(drag.anchor, drag.current, start + SNAP);
    } else {
      // A plain click or tap: a one-hour slot from the half hour it landed in.
      start = Math.floor(drag.anchor / 30) * 30;
      end = start + 60;
    }
    end = Math.min(end, 23 * 60 + 59);
    start = Math.min(start, end - SNAP);
    onCreate(date, timeOf(start), timeOf(end));
  }

  const preview = drag?.moved
    ? { start: Math.min(drag.anchor, drag.current), end: Math.max(drag.anchor, drag.current) }
    : null;

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => setDrag(null)}
      className={`relative touch-pan-y select-none border-l border-[#dce1ce] ${
        past ? "bg-[#183c30]/[0.03]" : "cursor-cell"
      }`}
      style={{ backgroundImage: HOUR_LINES }}
    >
      {layoutBlocks(blocks).map(({ item: block, lane, lanes }) => {
        const top = (minutesOf(block.startTime) / 60) * HOUR_HEIGHT;
        const height = Math.max(((minutesOf(block.endTime) - minutesOf(block.startTime)) / 60) * HOUR_HEIGHT, 20);
        const position = {
          top: top + 1,
          height: height - 2,
          left: `calc(${(lane / lanes) * 100}% + 2px)`,
          width: `calc(${100 / lanes}% - 4px)`,
        };
        const range = formatTimeRange(block.startTime, block.endTime);
        const look = `rounded-[5px] px-1.5 py-1 text-left text-[11px] leading-tight ${KIND_CHIP[block.kind]} ${
          past ? "opacity-50" : ""
        }`;

        if (isAllDay(block)) {
          // A whole day is just a block filling the column. It doesn't take clicks itself, so
          // clicking or dragging on it still starts a time on that day (whose popup lists it).
          // No overflow-hidden here: it would stop the label sticking while the grid scrolls.
          return (
            <div key={block.entryIds.join()} className={`pointer-events-none absolute ${look}`} style={position}>
              <span className="sticky top-1 hidden truncate font-semibold sm:block">
                {KIND_LABEL[block.kind]} · All day
              </span>
            </div>
          );
        }

        return (
          <button
            type="button"
            data-block
            key={block.entryIds.join()}
            disabled={past}
            onClick={() => onOpenDay(date, block.entryIds)}
            aria-label={`${KIND_LABEL[block.kind]} ${range}`}
            // Buttons centre their content vertically by default; blocks read from the top, like Google's.
            className={`absolute flex flex-col items-stretch justify-start overflow-hidden ${look} ${
              past ? "" : "transition hover:brightness-95"
            }`}
            style={position}
          >
            {/* Phone columns are too narrow for text: blocks are plain colour there, tap for details. */}
            <span className="hidden truncate font-semibold sm:block">{KIND_LABEL[block.kind]}</span>
            {height >= 36 && <span className="hidden truncate sm:block">{range}</span>}
          </button>
        );
      })}

      {preview && (
        <div
          className="pointer-events-none absolute inset-x-0.5 z-10 overflow-hidden rounded-[5px] border-2 border-dashed border-[#183c30] bg-[#deef8a]/70 px-1.5 py-0.5 text-[11px] font-semibold text-[#183c30]"
          style={{ top: (preview.start / 60) * HOUR_HEIGHT, height: ((preview.end - preview.start) / 60) * HOUR_HEIGHT }}
        >
          {formatTimeRange(timeOf(preview.start), timeOf(preview.end))}
        </div>
      )}

      {nowMinutes !== null && (
        <div
          className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-[#c2553b]"
          style={{ top: (nowMinutes / 60) * HOUR_HEIGHT }}
        >
          <span className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#c2553b]" />
        </div>
      )}
    </div>
  );
}
