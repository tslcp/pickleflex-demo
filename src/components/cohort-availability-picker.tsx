import { Check } from "lucide-react";
import { cohortHourSlots, formatBlock, formatHour, validBlockStarts } from "@/lib/scheduling";
import type { Cohort, DayAvailability } from "@/lib/types";

const MIN_DAYS = 2;
const WEEK_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function dayAbbrev(day: string) {
  return day.slice(0, 2);
}

function WeekStrip({ activeDays }: { activeDays: string[] }) {
  return (
    <div className="mt-2.5 flex gap-1">
      {WEEK_DAYS.map((day) => {
        const active = activeDays.includes(day);
        return (
          <span
            key={day}
            title={day}
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold transition-colors ${
              active ? "bg-emerald-500 text-white" : "bg-zinc-100 text-zinc-400"
            }`}
          >
            {dayAbbrev(day)}
          </span>
        );
      })}
    </div>
  );
}

interface CohortAvailabilityPickerProps {
  cohorts: Cohort[];
  cohortId: string;
  onCohortChange: (id: string) => void;
  availability: DayAvailability[];
  onAvailabilityChange: (availability: DayAvailability[]) => void;
}

export function CohortAvailabilityPicker({
  cohorts,
  cohortId,
  onCohortChange,
  availability,
  onAvailabilityChange,
}: CohortAvailabilityPickerProps) {
  const cohort = cohorts.find((c) => c.id === cohortId);
  const starts = cohort ? validBlockStarts(cohort) : [];
  const slots = cohort ? cohortHourSlots(cohort) : [];
  const daysValid = availability.length >= MIN_DAYS;

  function selectCohort(id: string) {
    onCohortChange(id);
    onAvailabilityChange([]);
  }

  function toggleDay(day: string) {
    const exists = availability.some((a) => a.day === day);
    if (exists) {
      onAvailabilityChange(availability.filter((a) => a.day !== day));
    } else if (cohort) {
      onAvailabilityChange([...availability, { day, startHour: validBlockStarts(cohort)[0] }]);
    }
  }

  function setDayBlock(day: string, startHour: number) {
    onAvailabilityChange(availability.map((a) => (a.day === day ? { ...a, startHour } : a)));
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-medium text-zinc-700">Scheduling Cohort</span>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {cohorts.map((c) => {
          const selected = c.id === cohortId;
          return (
            <button
              type="button"
              key={c.id}
              onClick={() => selectCohort(c.id)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                selected
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-zinc-200 bg-white hover:border-zinc-300"
              }`}
            >
              <p className="text-sm font-medium text-zinc-900">{c.label}</p>
              <p className="text-xs text-zinc-500">
                {formatHour(c.windowStartHour)} – {formatHour(c.windowEndHour)}
              </p>
              <WeekStrip activeDays={c.days} />
            </button>
          );
        })}
      </div>

      {cohort && (
        <div className="flex flex-col gap-3 rounded-lg bg-zinc-50 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-zinc-700">Pick at least {MIN_DAYS} days</span>
            <span className={daysValid ? "font-medium text-emerald-600" : "text-zinc-400"}>
              {availability.length}/{cohort.days.length} selected{daysValid ? " ✓" : ""}
            </span>
          </div>

          {cohort.days.map((day) => {
            const entry = availability.find((a) => a.day === day);
            const active = !!entry;
            return (
              <div
                key={day}
                className={`rounded-lg border p-3 ${active ? "border-emerald-200 bg-white" : "border-zinc-200 bg-white"}`}
              >
                <button
                  type="button"
                  onClick={() => toggleDay(day)}
                  className="flex w-full items-center gap-3 text-sm font-medium text-zinc-900"
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                      active ? "bg-emerald-500 text-white" : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {dayAbbrev(day)}
                  </span>
                  <span className="flex-1 text-left">{day}</span>
                  {active && <Check className="h-4 w-4 shrink-0 text-emerald-600" />}
                </button>

                {active && (
                  <div className="mt-3 flex flex-col gap-2">
                    <div className="flex gap-1.5">
                      {starts.map((s) => (
                        <button
                          type="button"
                          key={s}
                          onClick={() => setDayBlock(day, s)}
                          className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                            entry?.startHour === s
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : "border-zinc-200 text-zinc-600 hover:border-zinc-300"
                          }`}
                        >
                          {formatBlock(s)}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      {slots.map((slotStart) => {
                        const filled =
                          entry !== undefined &&
                          slotStart >= entry.startHour &&
                          slotStart < entry.startHour + 3;
                        return (
                          <span
                            key={slotStart}
                            className={`h-1.5 flex-1 rounded-full ${filled ? "bg-emerald-500" : "bg-zinc-200"}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
