// @vitest-environment jsdom
// Set the browser/node environment timezone to America/New_York (UTC-5)
process.env.TZ = "America/New_York";

import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TZDate } from "@date-fns/tz";
import { startOfWeek, endOfWeek, startOfDay, endOfDay } from "date-fns";
import AppointmentsPage from "@/app/(app)/appointments/page";
import { AppointmentsCalendar } from "@/components/appointments/appointments-calendar";
import * as AuthProviderModule from "@/components/providers/auth-provider";
import { api } from "@/lib/api";
import type { Appointment, Doctor } from "@/types";

const mockSearchParams = new URLSearchParams(
    "view=day&date=2026-11-15&doctorId=doc-dhaka-1"
);

vi.mock("next/navigation", () => ({
    useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
    }),
    usePathname: () => "/appointments",
    useSearchParams: () => mockSearchParams,
}));

vi.mock("@/lib/api", () => ({
    api: {
        get: vi.fn(),
        post: vi.fn(),
    },
    ApiError: class ApiError extends Error {
        status: number;
        code?: string;
        constructor(message: string, status: number, code?: string) {
            super(message);
            this.status = status;
            this.code = code;
            this.name = "ApiError";
        }
    },
}));

describe("Timezone Handling (Doctor in Asia/Dhaka, Browser in America/New_York)", () => {
    const mockDoctorDhaka: Doctor = {
        _id: "doc-dhaka-1",
        name: "Dr. Tanvir Rahman",
        email: "tanvir@clinic.com",
        phone: "+8801700000000",
        specialization: "General Medicine",
        hospital: "Dhaka Central Hospital",
        timezone: "Asia/Dhaka",
        slotMinutes: 30,
        workingHours: [
            { dayOfWeek: 0, start: "08:00", end: "16:00" }, // Sunday
            { dayOfWeek: 1, start: "08:00", end: "16:00" }, // Monday
        ],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
    };

    // Sunday 09:00 AM in Dhaka (+06:00) is 2026-11-15T03:00:00.000Z.
    // In America/New_York (-05:00), this instant is Saturday night, Nov 14 at 22:00.
    const sundayMorningDhakaISO = "2026-11-15T03:00:00.000Z";

    const sundayAppointment: Appointment = {
        _id: "appt-sun-1",
        doctorId: mockDoctorDhaka,
        patientId: {
            _id: "pat-1",
            name: "Rahim Uddin",
            email: "rahim@example.com",
            phone: "+8801811111111",
            age: 35,
            gender: "male",
            condition: "Hypertension",
            doctorId: "doc-dhaka-1",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
        },
        startsAt: sundayMorningDhakaISO,
        endsAt: "2026-11-15T03:30:00.000Z", // 09:30 Dhaka
        status: "scheduled",
        reason: "Routine Sunday checkup",
        createdAt: "2026-11-01T00:00:00.000Z",
        updatedAt: "2026-11-01T00:00:00.000Z",
    };

    it("verifies process.env.TZ is America/New_York", () => {
        // Confirm the test environment is indeed running in America/New_York
        const now = new Date("2026-11-15T03:00:00.000Z");
        const browserHour = now.getHours();
        // In UTC-5, 03:00 UTC is 22:00 on previous day
        expect(browserHour).toBe(22);
        expect(now.getDate()).toBe(14); // Nov 14 in New York
    });

    it("computes fetch range in doctor timezone so Sunday 09:00 Dhaka falls within Sunday range", () => {
        const dateStr = "2026-11-15";
        const [y, m, d] = dateStr.split("-").map(Number);

        // Compute using doctor's timezone
        const targetDateDhaka = new TZDate(y, m - 1, d, "Asia/Dhaka");
        const dhakaDayStart = startOfDay(targetDateDhaka);
        const dhakaDayEnd = endOfDay(targetDateDhaka);

        const fromDhaka = new Date(dhakaDayStart.getTime()).toISOString();
        const toDhaka = new Date(dhakaDayEnd.getTime()).toISOString();

        // 2026-11-15 00:00:00 Dhaka is 2026-11-14T18:00:00.000Z
        expect(fromDhaka).toBe("2026-11-14T18:00:00.000Z");
        // 2026-11-15 23:59:59.999 Dhaka is 2026-11-15T17:59:59.999Z
        expect(toDhaka).toBe("2026-11-15T17:59:59.999Z");

        // The Sunday 09:00 Dhaka appointment (03:00 UTC) must be within range
        const apptTime = new Date(sundayMorningDhakaISO).getTime();
        expect(apptTime).toBeGreaterThanOrEqual(new Date(fromDhaka).getTime());
        expect(apptTime).toBeLessThanOrEqual(new Date(toDhaka).getTime());

        // Contrast: if computed in America/New_York browser timezone:
        const nyDayStart = startOfDay(new Date(y, m - 1, d)); // Nov 15 00:00 NY
        const fromNY = nyDayStart.toISOString(); // 2026-11-15T05:00:00.000Z
        // In the flawed browser calculation, Sunday 09:00 Dhaka (03:00 UTC) would be OUTSIDE:
        expect(apptTime).toBeLessThan(new Date(fromNY).getTime());
    });

    it("computes week fetch range in doctor timezone including the full Sunday through Saturday week", () => {
        const dateStr = "2026-11-15";
        const [y, m, d] = dateStr.split("-").map(Number);

        const targetDateDhaka = new TZDate(y, m - 1, d, "Asia/Dhaka");
        const weekStartDhaka = startOfWeek(targetDateDhaka, { weekStartsOn: 0 });
        const weekEndDhaka = endOfWeek(targetDateDhaka, { weekStartsOn: 0 });

        const fromWeek = new Date(weekStartDhaka.getTime()).toISOString();
        const toWeek = new Date(weekEndDhaka.getTime()).toISOString();

        expect(fromWeek).toBe("2026-11-14T18:00:00.000Z");
        expect(toWeek).toBe("2026-11-21T17:59:59.999Z");

        const apptTime = new Date(sundayMorningDhakaISO).getTime();
        expect(apptTime).toBeGreaterThanOrEqual(new Date(fromWeek).getTime());
        expect(apptTime).toBeLessThanOrEqual(new Date(toWeek).getTime());
    });

    it("renders Sunday 09:00 Dhaka appointment in Sunday's column with hourCycle: h23", () => {
        const selectedDate = new Date(2026, 10, 15); // Nov 15, 2026

        render(
            <AppointmentsCalendar
                appointments={[sundayAppointment]}
                doctor={mockDoctorDhaka}
                view="week"
                selectedDate={selectedDate}
                onSelectAppointment={vi.fn()}
            />
        );

        // Header must show Doctor's timezone
        expect(screen.getByText("Asia/Dhaka")).toBeInTheDocument();

        // Must show Sunday header
        expect(screen.getByText("Sunday")).toBeInTheDocument();

        // Must display the patient name and appointment time formatted in Dhaka (09:00 – 09:30)
        expect(screen.getByText("Rahim Uddin")).toBeInTheDocument();
        expect(screen.getByText(/09:00\s*–\s*09:30/)).toBeInTheDocument();

        // Must NOT format in browser-local New York time (which would be 22:00)
        expect(screen.queryByText(/22:00/)).not.toBeInTheDocument();
    });

    it("renders AppointmentsPage with Dhaka doctor and asserts request URL has from=2026-11-14T18:00:00.000Z for day view of 2026-11-15", async () => {
        vi.spyOn(AuthProviderModule, "useAuth").mockReturnValue({
            user: {
                id: "u-admin",
                name: "Admin User",
                email: "admin@clinic.com",
                role: "admin",
            },
            role: "admin",
            isLoading: false,
            isAuthenticated: true,
            login: vi.fn(),
            logout: vi.fn(),
            logoutAll: vi.fn(),
            can: () => true,
        });

        vi.mocked(api.get).mockImplementation(async (url: string) => {
            if (url.startsWith("/doctors")) {
                return { success: true, data: { doctors: [mockDoctorDhaka] } };
            }
            if (url.startsWith("/appointments")) {
                return { success: true, data: { appointments: [sundayAppointment] } };
            }
            return { success: true, data: {} };
        });

        const queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false, gcTime: 0 },
            },
        });

        render(
            <QueryClientProvider client={queryClient}>
                <AppointmentsPage />
            </QueryClientProvider>
        );

        // Wait for appointment request to be dispatched and card rendered
        await screen.findByText("Rahim Uddin");

        const appointmentCalls = vi.mocked(api.get).mock.calls
            .map(([url]) => url)
            .filter((url) => url.startsWith("/appointments?"));

        expect(appointmentCalls.length).toBeGreaterThan(0);
        const requestedUrl = appointmentCalls[0];
        const search = new URLSearchParams(requestedUrl.replace("/appointments?", ""));

        // Must request the day boundary in Dhaka timezone: 2026-11-14T18:00:00.000Z to 2026-11-15T17:59:59.999Z
        expect(search.get("from")).toBe("2026-11-14T18:00:00.000Z");
        expect(search.get("to")).toBe("2026-11-15T17:59:59.999Z");
        expect(search.get("doctorId")).toBe("doc-dhaka-1");
    });
});
