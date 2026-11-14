import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppointmentsDashboard } from "@/components/dashboard/appointments-dashboard";
import { api } from "@/lib/api";
import type { AppointmentsDashboardStats } from "@/types";

vi.mock("@/lib/api", () => ({
    api: {
        get: vi.fn(),
    },
}));

function renderWithClient(ui: React.ReactElement) {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return render(
        <QueryClientProvider client={queryClient}>
            {ui}
        </QueryClientProvider>
    );
}

const mockStatsAdmin: AppointmentsDashboardStats = {
    today: {
        total: 12,
        scheduled: 5,
        completed: 4,
        cancelled: 1,
        noShow: 2,
    },
    next7Days: [
        { date: "2026-11-15", scheduledCount: 5 },
        { date: "2026-11-16", scheduledCount: 7 },
    ],
    noShowRate: {
        ratePercentage: 16.7,
        noShowCount: 2,
        totalAppointments: 12,
        range: "30d",
    },
    topBusiestDoctors: [
        {
            doctorId: "doc-1",
            name: "Dr. Gregory House",
            specialization: "Diagnostics",
            hospital: "Princeton Plainsboro",
            scheduledCount: 24,
        },
    ],
};

const mockStatsDoctor: AppointmentsDashboardStats = {
    ...mockStatsAdmin,
    topBusiestDoctors: undefined, // Scoped response for doctor role
};

describe("AppointmentsDashboard Analytics", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders today's KPI cards and no-show rate", async () => {
        vi.mocked(api.get).mockResolvedValueOnce({
            success: true,
            data: mockStatsAdmin,
        });

        renderWithClient(<AppointmentsDashboard />);

        expect(await screen.findByText("Today's Total")).toBeInTheDocument();
        expect(screen.getByText("12")).toBeInTheDocument();
        expect(screen.getByText("5")).toBeInTheDocument(); // Scheduled
        expect(screen.getByText("4")).toBeInTheDocument(); // Completed
        expect(screen.getByText("16.7%")).toBeInTheDocument(); // No-show rate
    });

    it("renders Top Busiest Doctors when topBusiestDoctors is returned", async () => {
        vi.mocked(api.get).mockResolvedValueOnce({
            success: true,
            data: mockStatsAdmin,
        });

        renderWithClient(<AppointmentsDashboard />);

        expect(
            await screen.findByText("Top Busiest Practitioners")
        ).toBeInTheDocument();
        expect(screen.getByText("Dr. Gregory House")).toBeInTheDocument();
        expect(screen.getByText("24")).toBeInTheDocument();
    });

    it("omits Top Busiest Doctors when topBusiestDoctors is absent (doctor role)", async () => {
        vi.mocked(api.get).mockResolvedValueOnce({
            success: true,
            data: mockStatsDoctor,
        });

        renderWithClient(<AppointmentsDashboard />);

        expect(await screen.findByText("Today's Total")).toBeInTheDocument();
        expect(
            screen.queryByText("Top Busiest Practitioners")
        ).not.toBeInTheDocument();
    });
});

