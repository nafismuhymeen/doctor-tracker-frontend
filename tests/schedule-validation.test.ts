import { describe, it, expect } from "vitest";
import {
    parseMinutes,
    formatMinutes,
    hasNoOverlappingRanges,
    scheduleFormSchema,
} from "@/lib/schedule-validation";
import type { WorkingHours } from "@/types";

describe("Doctor Schedule Validation", () => {
    describe("Time parser & formatter", () => {
        it("accurately converts HH:mm strings to total minutes", () => {
            expect(parseMinutes("00:00")).toBe(0);
            expect(parseMinutes("09:30")).toBe(570);
            expect(parseMinutes("17:00")).toBe(1020);
            expect(parseMinutes("23:59")).toBe(1439);
        });

        it("accurately formats total minutes back to HH:mm strings", () => {
            expect(formatMinutes(0)).toBe("00:00");
            expect(formatMinutes(570)).toBe("09:30");
            expect(formatMinutes(1020)).toBe("17:00");
        });
    });

    describe("Overlap Detection (hasNoOverlappingRanges)", () => {
        it("returns true for non-overlapping ranges on the same day", () => {
            const ranges: WorkingHours[] = [
                { dayOfWeek: 1, start: "09:00", end: "12:00" },
                { dayOfWeek: 1, start: "13:00", end: "17:00" },
            ];
            expect(hasNoOverlappingRanges(ranges)).toBe(true);
        });

        it("returns true for ranges on different days with identical times", () => {
            const ranges: WorkingHours[] = [
                { dayOfWeek: 1, start: "09:00", end: "17:00" },
                { dayOfWeek: 2, start: "09:00", end: "17:00" },
            ];
            expect(hasNoOverlappingRanges(ranges)).toBe(true);
        });

        it("detects and rejects overlapping ranges on the same day", () => {
            const ranges: WorkingHours[] = [
                { dayOfWeek: 1, start: "09:00", end: "13:00" },
                { dayOfWeek: 1, start: "12:30", end: "17:00" },
            ];
            expect(hasNoOverlappingRanges(ranges)).toBe(false);
        });

        it("detects and rejects nested ranges on the same day", () => {
            const ranges: WorkingHours[] = [
                { dayOfWeek: 3, start: "08:00", end: "18:00" },
                { dayOfWeek: 3, start: "10:00", end: "14:00" },
            ];
            expect(hasNoOverlappingRanges(ranges)).toBe(false);
        });
    });

    describe("Schedule Form Schema Validation", () => {
        it("accepts valid schedule aligned with slotMinutes", () => {
            const validData = {
                timezone: "Asia/Dhaka",
                slotMinutes: 30,
                workingHours: [
                    { dayOfWeek: 1, start: "09:00", end: "17:00" }, // 480 mins / 30 = 16 slots
                    { dayOfWeek: 2, start: "10:00", end: "14:30" }, // 270 mins / 30 = 9 slots
                ],
            };
            const result = scheduleFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it("rejects ranges that do not align with slotMinutes", () => {
            const unalignedData = {
                timezone: "Asia/Dhaka",
                slotMinutes: 30,
                workingHours: [
                    { dayOfWeek: 1, start: "09:00", end: "09:40" }, // 40 mins not divisible by 30
                ],
            };
            const result = scheduleFormSchema.safeParse(unalignedData);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(
                    result.error.issues.some((i) =>
                        i.message.includes("align to the selected slot duration")
                    )
                ).toBe(true);
            }
        });

        it("rejects ranges where end time is before start time", () => {
            const invalidData = {
                timezone: "Asia/Dhaka",
                slotMinutes: 30,
                workingHours: [
                    { dayOfWeek: 1, start: "17:00", end: "09:00" },
                ],
            };
            const result = scheduleFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });

        it("rejects slotMinutes that are not a multiple of 5 or outside bounds", () => {
            expect(
                scheduleFormSchema.safeParse({
                    timezone: "Asia/Dhaka",
                    slotMinutes: 27, // not multiple of 5
                    workingHours: [],
                }).success
            ).toBe(false);

            expect(
                scheduleFormSchema.safeParse({
                    timezone: "Asia/Dhaka",
                    slotMinutes: 5, // below min 10
                    workingHours: [],
                }).success
            ).toBe(false);

            expect(
                scheduleFormSchema.safeParse({
                    timezone: "Asia/Dhaka",
                    slotMinutes: 150, // above max 120
                    workingHours: [],
                }).success
            ).toBe(false);
        });
    });
});

