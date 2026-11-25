import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DeleteDoctorDialog } from "@/components/doctors/delete-doctor-dialog";
import { api, ApiError } from "@/lib/api";
import type { Doctor } from "@/types";

vi.mock("@/lib/api", () => ({
    api: {
        get: vi.fn(),
        delete: vi.fn(),
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
    name: "Dr. Gregory House",
    specialization: "Diagnostics",
    hospital: "Princeton Plainsboro",
    phone: "555-0199",
    email: "house@ppth.org",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
};

describe("DeleteDoctorDialog Reassignment & Conflict Flow", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("requires selecting a replacement doctor when the doctor has assigned patients", async () => {
        const otherDoctors: Doctor[] = [
            {
                _id: "doc-2",
                name: "Dr. James Wilson",
                specialization: "Oncology",
                hospital: "Princeton Plainsboro",
                phone: "555-0198",
                email: "wilson@ppth.org",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            },
        ];

        vi.mocked(api.get).mockResolvedValueOnce({
            success: true,
            data: { doctors: otherDoctors },
        });

        renderWithClient(
            <DeleteDoctorDialog
                doctor={mockDoctor}
                open={true}
                onOpenChange={vi.fn()}
                initialPatientCount={4}
            />
        );

        expect(
            screen.getByText("Patient Reassignment Required")
        ).toBeInTheDocument();
        expect(screen.getByText("4")).toBeInTheDocument();
        expect(
            screen.getByText(/You must select a practitioner to inherit their roster/i)
        ).toBeInTheDocument();

        // The action button must be disabled until a target doctor is chosen
        const deleteBtn = screen.getByRole("button", {
            name: /Reassign & Delete Doctor/i,
        });
        expect(deleteBtn).toBeDisabled();
    });

    it("handles DOCTOR_HAS_APPOINTMENTS 409 conflict gracefully", async () => {
        vi.mocked(api.delete).mockRejectedValueOnce(
            new ApiError(
                "Cannot delete doctor with 3 future scheduled appointments. Cancel or complete them first.",
                409,
                "DOCTOR_HAS_APPOINTMENTS"
            )
        );

        renderWithClient(
            <DeleteDoctorDialog
                doctor={mockDoctor}
                open={true}
                onOpenChange={vi.fn()}
                initialPatientCount={0}
            />
        );

        const deleteBtn = screen.getByRole("button", { name: "Delete Doctor" });
        expect(deleteBtn).not.toBeDisabled();

        fireEvent.click(deleteBtn);

        await waitFor(() => {
            expect(
                screen.getByText("Active Appointments Detected")
            ).toBeInTheDocument();
        });

        expect(
            screen.getByRole("link", { name: /View Doctor's Appointments/i })
        ).toBeInTheDocument();
    });

    it("disables delete button while patient count is loading and never claims zero patients", () => {
        // Return a promise that never resolves immediately to simulate loading
        vi.mocked(api.get).mockReturnValue(new Promise(() => {}));

        renderWithClient(
            <DeleteDoctorDialog
                doctor={mockDoctor}
                open={true}
                onOpenChange={vi.fn()}
                // initialPatientCount omitted to trigger fetch
            />
        );

        expect(
            screen.getByText("Checking assigned patient roster...")
        ).toBeInTheDocument();
        expect(
            screen.queryByText(/has no assigned patients/i)
        ).not.toBeInTheDocument();

        // Delete button should be disabled while loading
        const deleteBtn = screen.getByRole("button", { name: /Delete Doctor/i });
        expect(deleteBtn).toBeDisabled();
    });

    it("shows error state with retry when patient query fails and never claims zero patients", async () => {
        vi.mocked(api.get).mockRejectedValue(
            new ApiError("Failed to fetch patients", 500)
        );

        renderWithClient(
            <DeleteDoctorDialog
                doctor={mockDoctor}
                open={true}
                onOpenChange={vi.fn()}
            />
        );

        await waitFor(() => {
            expect(
                screen.getByText("Failed to load patient roster")
            ).toBeInTheDocument();
        });

        expect(
            screen.queryByText(/has no assigned patients/i)
        ).not.toBeInTheDocument();

        const retryBtn = screen.getByRole("button", { name: /Retry/i });
        expect(retryBtn).toBeInTheDocument();

        const deleteBtn = screen.getByRole("button", { name: /Delete Doctor/i });
        expect(deleteBtn).toBeDisabled();
    });

    it("does not show appointment conflict if error code is not DOCTOR_HAS_APPOINTMENTS", async () => {
        vi.mocked(api.delete).mockRejectedValueOnce(
            new ApiError("Generic Conflict", 409, "OTHER_CONFLICT")
        );

        renderWithClient(
            <DeleteDoctorDialog
                doctor={mockDoctor}
                open={true}
                onOpenChange={vi.fn()}
                initialPatientCount={0}
            />
        );

        const deleteBtn = screen.getByRole("button", { name: "Delete Doctor" });
        fireEvent.click(deleteBtn);

        await waitFor(() => {
            expect(
                screen.queryByText("Active Appointments Detected")
            ).not.toBeInTheDocument();
        });
    });
});
