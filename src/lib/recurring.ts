import { addDaysIso } from "./dates";

export type RecurringFrequency = "weekly" | "monthly" | "quarterly" | "yearly";

export interface RecurringSchedule {
  id: string;
  user_id: string;
  template_dokument_id: string | null;
  frequency: RecurringFrequency;
  next_generation_at: string; // YYYY-MM-DD
  last_generated_at: string | null;
  end_date: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Advance an ISO date by one "step" of the given frequency.
 *
 * Month/quarter/year steps use calendar arithmetic (not days-per-month
 * approximations) so e.g. monthly from 2026-01-31 → 2026-02-28 correctly
 * (JS Date's setMonth handles the overflow by capping to end-of-month).
 */
export function advanceByFrequency(iso: string, frequency: RecurringFrequency): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  const [, y, m, d] = match;
  const yy = Number(y);
  const mm = Number(m);
  const dd = Number(d);

  if (frequency === "weekly") {
    return addDaysIso(iso, 7);
  }

  // For month-based steps, construct from components and let JS normalize.
  const target = new Date(yy, mm - 1, dd);
  const steps = frequency === "monthly" ? 1 : frequency === "quarterly" ? 3 : 12;
  const prevDay = target.getDate();
  target.setMonth(target.getMonth() + steps);
  // Guard against JS rolling forward when the target month has fewer days:
  // e.g. Jan 31 + 1 month would become Mar 3 instead of Feb 28.
  if (target.getDate() !== prevDay) {
    target.setDate(0); // roll back to last day of the intended month
  }
  const outY = target.getFullYear();
  const outM = String(target.getMonth() + 1).padStart(2, "0");
  const outD = String(target.getDate()).padStart(2, "0");
  return `${outY}-${outM}-${outD}`;
}

/**
 * Is this schedule due for generation on or before the given "today"?
 * A schedule that passed its end_date is never due.
 */
export function isDue(schedule: Pick<RecurringSchedule, "active" | "next_generation_at" | "end_date">, today: string): boolean {
  if (!schedule.active) return false;
  if (schedule.end_date && schedule.end_date < schedule.next_generation_at) return false;
  return schedule.next_generation_at <= today;
}
