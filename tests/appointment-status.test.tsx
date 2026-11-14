import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppointmentDetailsDialog } from "@/components/appointments/appointment-details-dialog";
import * as AuthProviderModule from "@/components/providers/auth-provider";
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";
import type { Appointment, Role, User } from "@/types";

vi.mock("@/lib/api", () => ({
    api: {
        patch: vi.fn(),
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

vi.mock("sonner", () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn(),
    },
}));

function mockAuth(role: Role) {
    const user: User = {
        id: "u-1",
        name: `User ${role}`,
        email: `${role}@clinic.com`,
        role,
    };

    vi.spyOn(AuthProviderModule, "useAuth").mockReturnValue({
        user,
        role,
        isLoading: false,
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn(),
        logoutAll: vi.fn(),
        can: () => true,
    });
}

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

const pastAppointment: Appointment = {
    _id: "appt-past",
    doctorId: {
        _id: "doc-1",
        name: "Dr. Sarah Johnson",
        specialization: "Cardiology",
        hospital: "Mayo Clinic",
        phone: "555-1234",
        email: "sarah@mayo.edu",
        timezone: "America/New_York",
        slotMinutes: 30,
        workingHours: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    patientId: {
        _id: "pat-1",
        name: "Jane Doe",
        age: 30,
        gender: "female",
        phone: "555-4321",
        condition: "Checkup",
        doctorId: "doc-1",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    startsAt: new Date(Date.now() - 3600 * 1000).toISOString(), // 1 hour ago
    endsAt: new Date(Date.now() - 1800 * 1000).toISOString(),
    status: "scheduled",
    reason: "Followup visit",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
};

const futureAppointment: Appointment = {
    ...pastAppointment,
    _id: "appt-future",
    startsAt: new Date(Date.now() + 86400 * 1000).toISOString(), // 1 day in future
    endsAt: new Date(Date.now() + 86400 * 1000 + 1800 * 1000).toISOString(),
};

describe("AppointmentDetailsDialog Status Actions", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuth("admin");
    });

    it("enables Complete and No-Show buttons for past scheduled appointments", () => {
        renderWithClient(
            <AppointmentDetailsDialog
                appointment={pastAppointment}
                open={true}
                onOpenChange={vi.fn()}
            />
        );

        const completeBtn = screen.getByRole("button", { name: /Complete/i });
        const noShowBtn = screen.getByRole("button", { name: /No-Show/i });

        expect(completeBtn).not.toBeDisabled();
        expect(noShowBtn).not.toBeDisabled();
    });

    it("disables Complete and No-Show buttons for future scheduled appointments", () => {
        renderWithClient(
            <AppointmentDetailsDialog
                appointment={futureAppointment}
                open={true}
                onOpenChange={vi.fn()}
            />
        );

        const completeBtn = screen.getByRole("button", { name: /Complete/i });
        const noShowBtn = screen.getByRole("button", { name: /No-Show/i });

        expect(completeBtn).toBeDisabled();
        expect(noShowBtn).toBeDisabled();
        expect(
            screen.getByText(/Future Appointment:/i)
        ).toBeInTheDocument();
    });

    it("hides action buttons for viewer role", () => {
        mockAuth("viewer");

        renderWithClient(
            <AppointmentDetailsDialog
                appointment={pastAppointment}
                open={true}
                onOpenChange={vi.fn()}
            />
        );

        expect(screen.queryByRole("button", { name: /Complete/i })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /No-Show/i })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /Cancel/i })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /Reschedule/i })).not.toBeInTheDocument();
    });

    it("submits status completed when clicked", async () => {
        vi.mocked(api.patch).mockResolvedValueOnce({ success: true, data: {} });

        renderWithClient(
            <AppointmentDetailsDialog
                appointment={pastAppointment}
                open={true}
                onOpenChange={vi.fn()}
            />
        );

        const completeBtn = screen.getByRole("button", { name: /Complete/i });
        fireEvent.click(completeBtn);

        await waitFor(() => {
            expect(api.patch).toHaveBeenCalledWith(
                "/appointments/appt-past/status",
                { status: "completed" }
            );
        });
    });

    it("handles INVALID_STATUS_TRANSITION gracefully", async () => {
        vi.mocked(api.patch).mockRejectedValueOnce(
            new ApiError("Invalid transition", 400, "INVALID_STATUS_TRANSITION")
        );

        renderWithClient(
            <AppointmentDetailsDialog
                appointment={pastAppointment}
                open={true}
                onOpenChange={vi.fn()}
            />
        );

        const completeBtn = screen.getByRole("button", { name: /Complete/i });
        fireEvent.click(completeBtn);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Status Conflict", {
                description:
                    "This appointment's status has already been modified. Refreshing.",
            });
        });
    });
});

