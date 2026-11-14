import * as z from "zod";
import type { WorkingHours } from "@/types";

export const COMMON_TIMEZONES = [
    "Asia/Dhaka",
    "UTC",
    "Asia/Kolkata",
    "Asia/Singapore",
    "Asia/Tokyo",
    "Asia/Dubai",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "Australia/Sydney",
] as const;

export const DAY_NAMES = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
] as const;

export function parseMinutes(timeStr: string): number {
    const parts = timeStr.split(":").map(Number);
    if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return 0;
    return parts[0] * 60 + parts[1];
}

export function formatMinutes(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60)
        .toString()
        .padStart(2, "0");
    const minutes = (totalMinutes % 60).toString().padStart(2, "0");
    return `${hours}:${minutes}`;
}

export function hasNoOverlappingRanges(ranges: WorkingHours[]): boolean {
    const byDay = new Map<number, Array<[number, number]>>();
    for (const item of ranges) {
        const list = byDay.get(item.dayOfWeek) || [];
        const s = parseMinutes(item.start);
        const e = parseMinutes(item.end);
        for (const [os, oe] of list) {
            // Overlap if start < otherEnd and end > otherStart
            if (s < oe && e > os) {
                return false;
            }
        }
        list.push([s, e]);
        byDay.set(item.dayOfWeek, list);
    }
    return true;
}

export const workingHourItemSchema = z
    .object({
        dayOfWeek: z.number().int().min(0).max(6),
        start: z
            .string()
            .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format must be HH:mm (e.g. 09:00)"),
        end: z
            .string()
            .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format must be HH:mm (e.g. 17:00)"),
    })
    .refine((data) => parseMinutes(data.start) < parseMinutes(data.end), {
        message: "Start time must be before end time",
        path: ["start"],
    });

export const scheduleFormSchema = z
    .object({
        timezone: z.string().min(1, "Timezone is required"),
        slotMinutes: z
            .number()
            .int()
            .min(10, "Slot duration must be at least 10 minutes")
            .max(120, "Slot duration cannot exceed 120 minutes")
            .refine((val) => val % 5 === 0, {
                message: "Slot duration must be a multiple of 5 minutes",
            }),
        workingHours: z
            .array(workingHourItemSchema)
            .max(28, "Cannot exceed 28 working hour ranges"),
    })
    .refine((data) => hasNoOverlappingRanges(data.workingHours), {
        message: "Working hour ranges must not overlap on the same day",
        path: ["workingHours"],
    })
    .refine(
        (data) => {
            const slot = data.slotMinutes;
            for (const range of data.workingHours) {
                const duration = parseMinutes(range.end) - parseMinutes(range.start);
                if (duration % slot !== 0) {
                    return false;
                }
            }
            return true;
        },
        {
            message: "All working hour ranges must align to the selected slot duration",
            path: ["workingHours"],
        }
    );

export type ScheduleFormData = z.infer<typeof scheduleFormSchema>;

