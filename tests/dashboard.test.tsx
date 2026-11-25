import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DashboardPage from "@/app/(app)/dashboard/page";
import { api } from "@/lib/api";

vi.mock("@/lib/api", () => ({
    api: {
        get: vi.fn(),
    },
}));

vi.mock("@/components/providers/auth-provider", () => ({
    useAuth: () => ({
        user: { id: "u-1", name: "Admin User", role: "admin" },
        role: "admin",
        isLoading: false,
        isAuthenticated: true,
    }),
}));

// Mock dynamic chart and subcomponents to isolate page filter testing
vi.mock("@/components/dashboard/stats-charts", () => ({
    default: () => <div data-testid="stats-charts">Charts</div>,
}));

vi.mock("@/components/dashboard/appointments-dashboard", () => ({
    AppointmentsDashboard: () => <div data-testid="appointments-dashboard">Appointments</div>,
}));

vi.mock("@/components/dashboard/doctor-my-day", () => ({
    DoctorMyDay: () => <div data-testid="doctor-my-day">My Day</div>,
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

describe("Dashboard Filters Accessibility", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(api.get).mockResolvedValue({
            success: true,
            data: {
                totalDoctors: 10,
                totalPatients: 100,
                activePrescriptions: 25,
                doctorsBySpecialization: [],
                recentActivity: [],
            },
        });
    });

    it("renders the dashboard statistics time range filter with an accessible name", async () => {
        renderWithClient(<DashboardPage />);

        const timeRangeCombobox = screen.getByRole("combobox", {
            name: /time range/i,
        });
        expect(timeRangeCombobox).toBeInTheDocument();
    });
});
