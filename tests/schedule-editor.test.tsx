import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ScheduleEditorDialog } from "@/components/doctors/schedule-editor-dialog";
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";

vi.mock("sonner", () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn(),
    },
}));

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

describe("ScheduleEditorDialog Presets & Configuration", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders with Sun-Thu and Mon-Fri preset buttons", () => {
        renderWithClient(
            <ScheduleEditorDialog
                doctorId="doc-1"
                doctorName="Dr. House"
                initialTimezone="Asia/Dhaka"
                initialSlotMinutes={30}
                open={true}
                onOpenChange={vi.fn()}
            />
        );

        expect(
            screen.getByRole("button", { name: /Sun–Thu 9–5/i })
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: /Mon–Fri 9–5/i })
        ).toBeInTheDocument();
    });

    it("applies Sun–Thu 9–5 preset shifts across Sunday through Thursday", () => {
        renderWithClient(
            <ScheduleEditorDialog
                doctorId="doc-1"
                doctorName="Dr. House"
                initialTimezone="Asia/Dhaka"
                initialSlotMinutes={30}
                open={true}
                onOpenChange={vi.fn()}
            />
        );

        const sunThuBtn = screen.getByRole("button", { name: /Sun–Thu 9–5/i });
        fireEvent.click(sunThuBtn);

        // Should have 5 shift cards created with Remove shift buttons
        const removeButtons = screen.getAllByRole("button", { name: /Remove shift/i });
        expect(removeButtons).toHaveLength(5);
    });

    it("applies Mon–Fri 9–5 preset shifts across Monday through Friday", () => {
        renderWithClient(
            <ScheduleEditorDialog
                doctorId="doc-1"
                doctorName="Dr. House"
                initialTimezone="Asia/Dhaka"
                initialSlotMinutes={30}
                open={true}
                onOpenChange={vi.fn()}
            />
        );

        const monFriBtn = screen.getByRole("button", { name: /Mon–Fri 9–5/i });
        fireEvent.click(monFriBtn);

        // Should have 5 shift cards created with Remove shift buttons
        const removeButtons = screen.getAllByRole("button", { name: /Remove shift/i });
        expect(removeButtons).toHaveLength(5);
    });

    it("maps UNALIGNED_WORKING_HOURS error code specifically", async () => {
        vi.mocked(api.patch).mockRejectedValueOnce(
            new ApiError(
                "Working hours must align to the 45-minute slot length (09:00-17:00 is 480 minutes)",
                400,
                "UNALIGNED_WORKING_HOURS"
            )
        );

        renderWithClient(
            <ScheduleEditorDialog
                doctorId="doc-1"
                doctorName="Dr. House"
                initialTimezone="Asia/Dhaka"
                initialSlotMinutes={30}
                open={true}
                onOpenChange={vi.fn()}
            />
        );

        // Submit form
        fireEvent.click(screen.getByRole("button", { name: /Save Schedule/i }));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Unaligned Working Hours", {
                description:
                    "Working hours must align to the 45-minute slot length (09:00-17:00 is 480 minutes)",
            });
        });
    });
});
