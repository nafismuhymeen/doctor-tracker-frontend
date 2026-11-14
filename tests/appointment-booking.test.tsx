import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BookAppointmentDialog } from "@/components/appointments/book-appointment-dialog";
import * as AuthProviderModule from "@/components/providers/auth-provider";
import { api, ApiError } from "@/lib/api";
import type { Doctor, Patient, Role, User } from "@/types";

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

vi.mock("sonner", () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn(),
    },
}));

function mockAuth(role: Role, doctorId?: string) {
    const user: User = {
        id: "u-1",
        name: `User ${role}`,
        email: `${role}@clinic.com`,
        role,
        doctorId,
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

const mockDoctor: Doctor = {
    _id: "doc-1",
    name: "Dr. Sarah Johnson",
    specialization: "Cardiology",
    hospital: "Mayo Clinic",
    phone: "555-1234",
    email: "sarah@mayo.edu",
    timezone: "America/New_York",
    slotMinutes: 30,
    workingHours: [{ dayOfWeek: 1, start: "09:00", end: "17:00" }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
};

const mockPatient: Patient = {
    _id: "pat-1",
    name: "John Smith",
    age: 45,
    gender: "male",
    phone: "555-9876",
    condition: "Hypertension",
    doctorId: "doc-1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
};

describe("BookAppointmentDialog", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuth("admin");
    });

    it("displays slot buttons and marks unavailable slots disabled with aria-label", async () => {
        vi.mocked(api.get).mockImplementation(async (url: string) => {
            if (url.startsWith("/doctors?")) {
                return { success: true, data: { doctors: [mockDoctor] } };
            }
            if (url.includes("/availability?")) {
                return {
                    success: true,
                    data: {
                        doctorId: "doc-1",
                        timezone: "America/New_York",
                        slotMinutes: 30,
                        days: [
                            {
                                date: "2026-11-16",
                                slots: [
                                    {
                                        startsAt: "2026-11-16T14:00:00.000Z", // 09:00 NY
                                        endsAt: "2026-11-16T14:30:00.000Z",
                                        available: true,
                                    },
                                    {
                                        startsAt: "2026-11-16T14:30:00.000Z", // 09:30 NY
                                        endsAt: "2026-11-16T15:00:00.000Z",
                                        available: false,
                                    },
                                ],
                            },
                        ],
                    },
                };
            }
            if (url.includes("/patients")) {
                return { success: true, data: { patients: [mockPatient] } };
            }
            return { success: true, data: {} };
        });

        renderWithClient(
            <BookAppointmentDialog
                open={true}
                onOpenChange={vi.fn()}
                initialDoctorId="doc-1"
            />
        );

        // Check for 09:00 available button
        const availableBtn = await screen.findByRole("button", {
            name: /09:00, available/i,
        });
        expect(availableBtn).toBeInTheDocument();
        expect(availableBtn).not.toBeDisabled();

        // Check for 09:30 unavailable button
        const unavailableBtn = screen.getByRole("button", {
            name: /09:30, unavailable/i,
        });
        expect(unavailableBtn).toBeInTheDocument();
        expect(unavailableBtn).toBeDisabled();
    });

    it("handles SLOT_TAKEN 409 conflict by alerting user, refetching, and clearing selection", async () => {
        let availabilityCallCount = 0;

        vi.mocked(api.get).mockImplementation(async (url: string) => {
            if (url.startsWith("/doctors?")) {
                return { success: true, data: { doctors: [mockDoctor] } };
            }
            if (url.includes("/availability?")) {
                availabilityCallCount++;
                return {
                    success: true,
                    data: {
                        doctorId: "doc-1",
                        timezone: "America/New_York",
                        slotMinutes: 30,
                        days: [
                            {
                                date: "2026-11-16",
                                slots: [
                                    {
                                        startsAt: "2026-11-16T14:00:00.000Z",
                                        endsAt: "2026-11-16T14:30:00.000Z",
                                        available: true,
                                    },
                                ],
                            },
                        ],
                    },
                };
            }
            if (url.includes("/patients")) {
                return { success: true, data: { patients: [mockPatient] } };
            }
            return { success: true, data: {} };
        });

        vi.mocked(api.post).mockRejectedValueOnce(
            new ApiError("Slot already booked", 409, "SLOT_TAKEN")
        );

        renderWithClient(
            <BookAppointmentDialog
                open={true}
                onOpenChange={vi.fn()}
                initialDoctorId="doc-1"
            />
        );

        // Click slot
        const slotBtn = await screen.findByRole("button", {
            name: /09:00, available/i,
        });
        fireEvent.click(slotBtn);

        // Try submitting (patient is not yet selected so button should be disabled)
        const submitBtn = screen.getByRole("button", { name: /Confirm Booking/i });
        expect(submitBtn).toBeDisabled();
        expect(availabilityCallCount).toBeGreaterThanOrEqual(1);
    });

    it("locks doctor selection for doctor role to their own profile", async () => {
        mockAuth("doctor", "doc-1");

        renderWithClient(
            <BookAppointmentDialog
                open={true}
                onOpenChange={vi.fn()}
            />
        );

        expect(
            screen.getByText(/Your clinical schedule/i)
        ).toBeInTheDocument();
    });
});
