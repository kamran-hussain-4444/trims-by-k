import { addDays, addMinutes } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { BOOKING_RULES, TIMEZONE } from "./config";

// Pure slot maths, no database access, so it can be tested on its own.

export type AvailabilityBlock = {
  weekday: number; // 0 = Sunday ... 6 = Saturday
  startTime: string; // "HH:MM", London time
  endTime: string;
};

export type Interval = { start: Date; end: Date };

// The time a booking takes out of the diary, including driving there and back.
export function occupiedInterval(start: Date, durationMin: number, travelMin: number): Interval {
  return {
    start: addMinutes(start, -travelMin),
    end: addMinutes(start, durationMin + travelMin),
  };
}

function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

export function weekdayOf(date: string): number {
  // Noon avoids any daylight-saving edge at midnight.
  return fromZonedTime(`${date}T12:00:00`, TIMEZONE).getUTCDay();
}

export function todayInLondon(now: Date): string {
  return formatInTimeZone(now, TIMEZONE, "yyyy-MM-dd");
}

export function isBookableDate(date: string, now: Date): boolean {
  const today = todayInLondon(now);
  const last = formatInTimeZone(addDays(now, BOOKING_RULES.maxDaysAhead), TIMEZONE, "yyyy-MM-dd");
  return date >= today && date <= last;
}

export function computeSlots(opts: {
  date: string; // "YYYY-MM-DD"
  durationMin: number;
  travelMin: number;
  blocks: AvailabilityBlock[];
  busy: Interval[];
  closed: boolean;
  now: Date;
}): Date[] {
  const { date, durationMin, travelMin, blocks, busy, closed, now } = opts;
  if (closed || !isBookableDate(date, now)) return [];

  const earliest = addMinutes(now, BOOKING_RULES.minNoticeHours * 60);
  const weekday = weekdayOf(date);
  const slots: Date[] = [];

  for (const block of blocks.filter((b) => b.weekday === weekday)) {
    const blockStart = fromZonedTime(`${date}T${block.startTime}:00`, TIMEZONE);
    const blockEnd = fromZonedTime(`${date}T${block.endTime}:00`, TIMEZONE);

    for (
      let t = addMinutes(blockStart, travelMin);
      addMinutes(t, durationMin + travelMin) <= blockEnd;
      t = addMinutes(t, BOOKING_RULES.slotStepMin)
    ) {
      if (t < earliest) continue;
      const occupied = occupiedInterval(t, durationMin, travelMin);
      if (busy.some((b) => overlaps(occupied, b))) continue;
      slots.push(t);
    }
  }

  return slots.sort((a, b) => a.getTime() - b.getTime());
}

export function formatSlotTime(d: Date): string {
  return formatInTimeZone(d, TIMEZONE, "HH:mm");
}

export function formatLongDate(d: Date): string {
  return formatInTimeZone(d, TIMEZONE, "EEEE d MMMM");
}

export function formatDateTime(d: Date): string {
  return formatInTimeZone(d, TIMEZONE, "EEE d MMM, HH:mm");
}
