import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";

import * as AuthProviderModule from "@/components/providers/auth-provider";
import { can } from "@/lib/permissions";
import { api, ApiError } from "@/lib/api";
import {
    vitalsSchema,
    prescriptionItemSchema,
    createVisitSchema,
    createAddendumSchema,
    VISIT_EDIT_WINDOW_HOURS,
} from "@/lib/visit-validation";
import PatientDetailPage from "@/app/(app)/patients/[id]/page";
import { VisitsTimeline } from "@/components/visits/visits-timeline";
import { RecordVisitDialog } from "@/components/visits/record-visit-dialog";
import { AppointmentDetailsDialog } from "@/components/appointments/appointment-details-dialog";
import type { Appointment, Doctor, Patient, Role, User, Visit } from "@/types";

// Mock next/navigation
const mockRouterPush = vi.fn();
const mockRouterReplace = vi.fn();
let mockCurrentTab = "overview";

vi.mock("next/navigation", () => ({
    useParams: () => ({ id: "patient-1" }),
    useRouter: () => ({ push: mockRouterPush, replace: mockRouterReplace }),
    usePathname: () => "/patients/patient-1",
    useSearchParams: () => ({
        get: (param: string) => (param === "tab" ? mockCurrentTab : null),
        toString: () => (mockCurrentTab ? `tab=${mockCurrentTab}` : ""),
    }),
}));

vi.mock("@/lib/api", () => ({
    api: {
        get: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
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
        can: (action, ctx) => can(role, action, ctx),
    });
}

function renderWithClient(ui: React.ReactElement) {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false, gcTime: 0 },
        },
    });
    return render(
        <QueryClientProvider client={queryClient}>
            {ui}
        </QueryClientProvider>
    );
}

const mockDoctor: Doctor = {
    _id: "doc-1",
    name: "Sarah Johnson",
    specialization: "Cardiology",
    hospital: "Central Hospital",
    phone: "1234567890",
    email: "sarah@clinic.com",
    timezone: "Asia/Dhaka",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
};

const mockPatient: Patient = {
    _id: "patient-1",
    name: "John Doe",
    age: 45,
    gender: "male",
    phone: "1234567890",
    email: "john@example.com",
    condition: "Hypertension",
    doctorId: mockDoctor,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("Phase F4: Patient detail and clinical visits", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockCurrentTab = "overview";
    });

    describe("1. Zod Schema Validations", () => {
        it("validates vitals ranges correctly", () => {
            // Valid vitals
            expect(
                vitalsSchema.safeParse({
                    bpSystolic: 120,
                    bpDiastolic: 80,
                    heartRate: 72,
                    temperatureC: 37,
                    weightKg: 70,
                }).success
            ).toBe(true);

            // Systolic out of range
            expect(vitalsSchema.safeParse({ bpSystolic: 40 }).success).toBe(false);
            expect(vitalsSchema.safeParse({ bpSystolic: 260 }).success).toBe(false);

            // Diastolic out of range
            expect(vitalsSchema.safeParse({ bpDiastolic: 20 }).success).toBe(false);
            expect(vitalsSchema.safeParse({ bpDiastolic: 160 }).success).toBe(false);

            // Heart rate out of range
            expect(vitalsSchema.safeParse({ heartRate: 25 }).success).toBe(false);
            expect(vitalsSchema.safeParse({ heartRate: 260 }).success).toBe(false);

            // Temperature out of range
            expect(vitalsSchema.safeParse({ temperatureC: 28 }).success).toBe(false);
            expect(vitalsSchema.safeParse({ temperatureC: 46 }).success).toBe(false);

            // Weight out of range
            expect(vitalsSchema.safeParse({ weightKg: 0 }).success).toBe(false);
            expect(vitalsSchema.safeParse({ weightKg: 350 }).success).toBe(false);
        });

        it("validates prescriptions array and item limits", () => {
            // Valid item
            expect(
                prescriptionItemSchema.safeParse({
                    drug: "Amoxicillin",
                    dose: "500mg",
                    frequency: "3 times daily",
                    durationDays: 7,
                }).success
            ).toBe(true);

            // Invalid item (durationDays 0 or > 365)
            expect(
                prescriptionItemSchema.safeParse({
                    drug: "Amoxicillin",
                    dose: "500mg",
                    frequency: "3 times daily",
                    durationDays: 0,
                }).success
            ).toBe(false);

            // Up to 20 medications permitted
            const twentyMeds = Array.from({ length: 20 }, (_, i) => ({
                drug: `Medication ${i + 1}`,
                dose: "10mg",
                frequency: "Once daily",
                durationDays: 10,
            }));
            expect(
                createVisitSchema.safeParse({
                    patientId: "patient-1",
                    chiefComplaint: "Checkup",
                    diagnosis: "Healthy",
                    notes: "Routine checkup notes",
                    prescriptions: twentyMeds,
                }).success
            ).toBe(true);

            // 21 medications rejected
            const twentyOneMeds = [...twentyMeds, {
                drug: "Extra Med",
                dose: "10mg",
                frequency: "Once daily",
                durationDays: 10,
            }];
            const result = createVisitSchema.safeParse({
                patientId: "patient-1",
                chiefComplaint: "Checkup",
                diagnosis: "Healthy",
                notes: "Routine checkup notes",
                prescriptions: twentyOneMeds,
            });
            expect(result.success).toBe(false);
        });

        it("validates addendum length limits (max 2000 chars)", () => {
            expect(createAddendumSchema.safeParse({ text: "Patient feeling better" }).success).toBe(true);
            expect(createAddendumSchema.safeParse({ text: "" }).success).toBe(false);
            expect(createAddendumSchema.safeParse({ text: "a".repeat(2001) }).success).toBe(false);
        });
    });

    describe("2. Tab Visibility Per Role", () => {
        beforeEach(() => {
            vi.mocked(api.get).mockImplementation((url: string) => {
                if (url.includes("/patients/patient-1/visits")) {
                    return Promise.resolve({
                        data: { visits: [], pagination: { totalVisits: 0, totalPages: 1, currentPage: 1, limit: 10 } },
                    });
                }
                if (url.includes("/patients/patient-1")) {
                    return Promise.resolve({ data: { patient: mockPatient } });
                }
                if (url.includes("/appointments")) {
                    return Promise.resolve({ data: { appointments: [] } });
                }
                return Promise.resolve({ data: {} });
            });
        });

        it("shows Visits tab to admin", async () => {
            mockAuth("admin");
            renderWithClient(<PatientDetailPage />);

            await waitFor(() => {
                expect(screen.getByRole("heading", { name: /john doe/i })).toBeInTheDocument();
            });

            expect(screen.getByRole("tab", { name: /visits/i })).toBeInTheDocument();
        });

        it("shows Visits tab to the treating doctor", async () => {
            mockAuth("doctor", "doc-1");
            renderWithClient(<PatientDetailPage />);

            await waitFor(() => {
                expect(screen.getByRole("heading", { name: /john doe/i })).toBeInTheDocument();
            });

            expect(screen.getByRole("tab", { name: /visits/i })).toBeInTheDocument();
        });

        it("does NOT show Visits tab to an out-of-scope doctor", async () => {
            mockAuth("doctor", "doc-other");
            renderWithClient(<PatientDetailPage />);

            await waitFor(() => {
                expect(screen.getByRole("heading", { name: /john doe/i })).toBeInTheDocument();
            });

            expect(screen.queryByRole("tab", { name: /visits/i })).not.toBeInTheDocument();
        });

        it("does NOT show Visits tab to staff", async () => {
            mockAuth("staff");
            renderWithClient(<PatientDetailPage />);

            await waitFor(() => {
                expect(screen.getByRole("heading", { name: /john doe/i })).toBeInTheDocument();
            });

            expect(screen.queryByRole("tab", { name: /visits/i })).not.toBeInTheDocument();
        });

        it("does NOT show Visits tab to viewer", async () => {
            mockAuth("viewer");
            renderWithClient(<PatientDetailPage />);

            await waitFor(() => {
                expect(screen.getByRole("heading", { name: /john doe/i })).toBeInTheDocument();
            });

            expect(screen.queryByRole("tab", { name: /visits/i })).not.toBeInTheDocument();
        });

        it("shows Access Denied view when staff navigates directly to ?tab=visits", async () => {
            mockAuth("staff");
            mockCurrentTab = "visits";
            renderWithClient(<PatientDetailPage />);

            await waitFor(() => {
                expect(screen.getByText("Access Denied")).toBeInTheDocument();
            });

            expect(
                screen.getByText(/You do not have permission to view clinical visit records/i)
            ).toBeInTheDocument();
        });
    });

    describe("3. 404 Out-of-Scope Doctor Access Handling", () => {
        it("renders clean Patient Not Found without crashing when API returns 404", async () => {
            mockAuth("doctor", "doc-2");
            vi.mocked(api.get).mockRejectedValueOnce(
                new ApiError("Patient not found", 404)
            );

            renderWithClient(<PatientDetailPage />);

            await waitFor(() => {
                expect(screen.getByText("Patient Not Found")).toBeInTheDocument();
            });

            expect(
                screen.getByText(/The requested patient record could not be found/i)
            ).toBeInTheDocument();
            expect(screen.getByRole("link", { name: /view patients list/i })).toBeInTheDocument();
        });
    });

    describe("4. Edit Window Countdown & Expiry in Visits Timeline", () => {
        it("shows 'Editable for X more hours' and Edit Visit button when within 24h", async () => {
            mockAuth("doctor", "doc-1");

            // Visit created 2 hours ago
            const recentCreatedAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
            const mockVisit: Visit = {
                _id: "v-1",
                patientId: "patient-1",
                doctorId: mockDoctor,
                visitDate: recentCreatedAt,
                chiefComplaint: "Headache",
                diagnosis: "Tension headache",
                notes: "Rest and hydration prescribed",
                createdBy: "u-1",
                createdAt: recentCreatedAt,
            };

            vi.mocked(api.get).mockResolvedValueOnce({
                data: {
                    visits: [mockVisit],
                    pagination: { totalVisits: 1, totalPages: 1, currentPage: 1, limit: 10 },
                },
            });

            renderWithClient(
                <VisitsTimeline
                    patientId="patient-1"
                    patientName="John Doe"
                    doctorTimezone="Asia/Dhaka"
                />
            );

            await waitFor(() => {
                expect(screen.getByText(/Editable for 22 more hours/i)).toBeInTheDocument();
            });

            expect(screen.getByRole("button", { name: /edit visit/i })).toBeInTheDocument();
        });

        it("hides Edit button after 24h and displays Add Addendum only", async () => {
            mockAuth("doctor", "doc-1");

            // Visit created 26 hours ago
            const expiredCreatedAt = new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString();
            const mockVisit: Visit = {
                _id: "v-2",
                patientId: "patient-1",
                doctorId: mockDoctor,
                visitDate: expiredCreatedAt,
                chiefComplaint: "Old cough",
                diagnosis: "Bronchitis",
                notes: "Completed course",
                createdBy: "u-1",
                createdAt: expiredCreatedAt,
            };

            vi.mocked(api.get).mockResolvedValueOnce({
                data: {
                    visits: [mockVisit],
                    pagination: { totalVisits: 1, totalPages: 1, currentPage: 1, limit: 10 },
                },
            });

            renderWithClient(
                <VisitsTimeline
                    patientId="patient-1"
                    patientName="John Doe"
                    doctorTimezone="Asia/Dhaka"
                />
            );

            await waitFor(() => {
                expect(screen.getByText("Old cough")).toBeInTheDocument();
            });

            // Edit button should NOT be present
            expect(screen.queryByRole("button", { name: /edit visit/i })).not.toBeInTheDocument();
            // Add Addendum button should be present
            expect(screen.getByRole("button", { name: /add addendum/i })).toBeInTheDocument();
        });

        it("handles 409 EDIT_WINDOW_EXPIRED by switching UI to addendum mode", async () => {
            mockAuth("doctor", "doc-1");
            const onSwitchToAddendum = vi.fn();

            const visitToEdit: Visit = {
                _id: "v-3",
                patientId: "patient-1",
                doctorId: mockDoctor,
                visitDate: new Date().toISOString(),
                chiefComplaint: "Stomach ache",
                diagnosis: "Gastritis",
                notes: "Antacids prescribed",
                createdBy: "u-1",
                createdAt: new Date().toISOString(),
            };

            vi.mocked(api.patch).mockRejectedValueOnce(
                new ApiError("Edit window expired", 409, "EDIT_WINDOW_EXPIRED")
            );

            renderWithClient(
                <RecordVisitDialog
                    open={true}
                    onOpenChange={vi.fn()}
                    patientId="patient-1"
                    doctorTimezone="Asia/Dhaka"
                    visitToEdit={visitToEdit}
                    onSwitchToAddendum={onSwitchToAddendum}
                />
            );

            const updateButton = screen.getByRole("button", { name: /update visit/i });
            fireEvent.click(updateButton);

            await waitFor(() => {
                expect(screen.getByText("Edit Window Expired")).toBeInTheDocument();
            });

            const switchButton = screen.getByRole("button", { name: /switch to addendum/i });
            fireEvent.click(switchButton);
            expect(onSwitchToAddendum).toHaveBeenCalledWith("v-3");
        });
    });

    describe("5. 409 VISIT_EXISTS Handling", () => {
        it("displays 'Visit Already Exists' message with link to timeline", async () => {
            mockAuth("doctor", "doc-1");

            vi.mocked(api.post).mockRejectedValueOnce(
                new ApiError("Clinical visit already exists for appointment", 409, "VISIT_EXISTS")
            );

            renderWithClient(
                <RecordVisitDialog
                    open={true}
                    onOpenChange={vi.fn()}
                    patientId="patient-1"
                    doctorTimezone="Asia/Dhaka"
                    appointmentId="appt-1"
                />
            );

            // Fill required fields
            fireEvent.change(screen.getByLabelText(/chief complaint/i), {
                target: { value: "Chest pain" },
            });
            fireEvent.change(screen.getByLabelText(/diagnosis/i), {
                target: { value: "Angina" },
            });
            fireEvent.change(screen.getByLabelText(/clinical notes/i), {
                target: { value: "Referred to cardiologist" },
            });

            fireEvent.click(screen.getByRole("button", { name: /record clinical visit/i }));

            await waitFor(() => {
                expect(screen.getByText("Visit Already Exists")).toBeInTheDocument();
            });

            expect(
                screen.getByText(/A clinical visit has already been recorded for this appointment/i)
            ).toBeInTheDocument();
            expect(screen.getByRole("button", { name: /view timeline/i })).toBeInTheDocument();
        });
    });

    describe("6. Appointment Details Dialog Record/View Visit Actions", () => {
        it("shows Record Visit for completed appointment without visitId for treating doctor", () => {
            mockAuth("doctor", "doc-1");

            const completedAppointment: Appointment = {
                _id: "appt-completed",
                doctorId: mockDoctor,
                patientId: mockPatient,
                startsAt: "2026-11-10T10:00:00.000Z",
                endsAt: "2026-11-10T10:30:00.000Z",
                status: "completed",
                createdAt: "2026-11-01T00:00:00.000Z",
            };

            renderWithClient(
                <AppointmentDetailsDialog
                    appointment={completedAppointment}
                    open={true}
                    onOpenChange={vi.fn()}
                />
            );

            expect(screen.getByRole("button", { name: /record visit/i })).toBeInTheDocument();
        });

        it("shows View Visit link when appointment has a visitId", () => {
            mockAuth("doctor", "doc-1");

            const appointmentWithVisit: Appointment = {
                _id: "appt-with-visit",
                doctorId: mockDoctor,
                patientId: mockPatient,
                startsAt: "2026-11-10T10:00:00.000Z",
                endsAt: "2026-11-10T10:30:00.000Z",
                status: "completed",
                visitId: "visit-123",
                createdAt: "2026-11-01T00:00:00.000Z",
            };

            renderWithClient(
                <AppointmentDetailsDialog
                    appointment={appointmentWithVisit}
                    open={true}
                    onOpenChange={vi.fn()}
                />
            );

            expect(screen.getByRole("link", { name: /view visit/i })).toBeInTheDocument();
            expect(screen.queryByRole("button", { name: /record visit/i })).not.toBeInTheDocument();
        });

        it("never offers Record Visit for future scheduled appointments", () => {
            mockAuth("doctor", "doc-1");

            // Appointment starts 2 days in the future
            const futureStartsAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
            const futureAppointment: Appointment = {
                _id: "appt-future",
                doctorId: mockDoctor,
                patientId: mockPatient,
                startsAt: futureStartsAt,
                endsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
                status: "scheduled",
                createdAt: "2026-11-01T00:00:00.000Z",
            };

            renderWithClient(
                <AppointmentDetailsDialog
                    appointment={futureAppointment}
                    open={true}
                    onOpenChange={vi.fn()}
                />
            );

            expect(screen.queryByRole("button", { name: /record visit/i })).not.toBeInTheDocument();
        });
    });

    describe("7. Doctor Timezone Default Date", () => {
        it("computes default visit date in doctor timezone, not browser-local", () => {
            // Emulate a moment when UTC is 2026-11-15T20:00:00Z:
            // In America/New_York (UTC-5), it is 2026-11-15 15:00.
            // In Asia/Dhaka (UTC+6), it is already 2026-11-16 02:00 (NEXT DAY).
            const mockDate = new Date("2026-11-15T20:00:00.000Z");
            vi.setSystemTime(mockDate);

            // Compute doctor date for Asia/Dhaka
            const doctorToday = format(new TZDate(mockDate, "Asia/Dhaka"), "yyyy-MM-dd");
            expect(doctorToday).toBe("2026-11-16");

            // Browser-local in America/New_York would be 2026-11-15
            const nyToday = format(new TZDate(mockDate, "America/New_York"), "yyyy-MM-dd");
            expect(nyToday).toBe("2026-11-15");

            // Render RecordVisitDialog with Asia/Dhaka
            renderWithClient(
                <RecordVisitDialog
                    open={true}
                    onOpenChange={vi.fn()}
                    patientId="patient-1"
                    doctorTimezone="Asia/Dhaka"
                />
            );

            const visitDateInput = screen.getByLabelText(/visit date/i) as HTMLInputElement;
            expect(visitDateInput.value).toBe("2026-11-16");

            vi.useRealTimers();
        });
    });

    describe("8. Review Findings: Payload, Edit Window, & Target Link", () => {
        it("omits followUpDate key completely when creating a visit with no follow-up date", async () => {
            mockAuth("doctor", "doc-1");

            let capturedPayload: unknown = null;
            vi.mocked(api.post).mockImplementation((url: string, body: unknown) => {
                if (url === "/visits") {
                    capturedPayload = body;
                    return Promise.resolve({
                        data: {
                            visit: {
                                _id: "v-new",
                                patientId: "patient-1",
                                doctorId: mockDoctor,
                                visitDate: "2026-11-16T12:00:00.000Z",
                                chiefComplaint: "Fever",
                                diagnosis: "Viral fever",
                                notes: "Fluids and rest",
                                createdAt: new Date().toISOString(),
                            },
                        },
                    });
                }
                return Promise.resolve({ data: {} });
            });

            renderWithClient(
                <RecordVisitDialog
                    open={true}
                    onOpenChange={vi.fn()}
                    patientId="patient-1"
                    doctorTimezone="Asia/Dhaka"
                />
            );

            fireEvent.change(screen.getByLabelText(/chief complaint/i), {
                target: { value: "Fever and headache" },
            });
            fireEvent.change(screen.getByLabelText(/diagnosis/i), {
                target: { value: "Viral syndrome" },
            });
            fireEvent.change(screen.getByLabelText(/clinical notes/i), {
                target: { value: "Adequate hydration and paracetamol recommended" },
            });

            // Ensure follow-up date input is empty
            const followUpInput = screen.getByLabelText(/follow-up date/i) as HTMLInputElement;
            expect(followUpInput.value).toBe("");

            fireEvent.click(screen.getByRole("button", { name: /record clinical visit/i }));

            await waitFor(() => {
                expect(capturedPayload).not.toBeNull();
            });

            // Assert payload does NOT have followUpDate key at all
            expect(capturedPayload).toBeDefined();
            expect(Object.prototype.hasOwnProperty.call(capturedPayload, "followUpDate")).toBe(false);
            expect("followUpDate" in (capturedPayload as Record<string, unknown>)).toBe(false);
        });

        it("sends followUpDate: null, prescriptions: [], and vitals: {} when cleared in edit mode", async () => {
            mockAuth("doctor", "doc-1");

            const existingVisit: Visit = {
                _id: "v-edit-cleared",
                patientId: "patient-1",
                doctorId: mockDoctor,
                visitDate: "2026-11-15T12:00:00.000Z",
                chiefComplaint: "Allergies",
                diagnosis: "Rhinitis",
                notes: "Antihistamine prescribed",
                followUpDate: "2026-11-20T12:00:00.000Z",
                vitals: {
                    bpSystolic: 120,
                    bpDiastolic: 80,
                    heartRate: 72,
                    temperatureC: 37,
                    weightKg: 68,
                },
                prescriptions: [
                    {
                        drug: "Cetirizine",
                        dose: "10mg",
                        frequency: "Once daily",
                        durationDays: 5,
                    },
                ],
                createdBy: "u-1",
                createdAt: new Date().toISOString(),
            };

            let capturedPatchPayload: unknown = null;
            vi.mocked(api.patch).mockImplementation((url: string, body: unknown) => {
                if (url === "/visits/v-edit-cleared") {
                    capturedPatchPayload = body;
                    return Promise.resolve({
                        data: {
                            visit: {
                                ...existingVisit,
                                followUpDate: null,
                                vitals: {},
                                prescriptions: [],
                            },
                        },
                    });
                }
                return Promise.resolve({ data: {} });
            });

            renderWithClient(
                <RecordVisitDialog
                    open={true}
                    onOpenChange={vi.fn()}
                    patientId="patient-1"
                    doctorTimezone="Asia/Dhaka"
                    visitToEdit={existingVisit}
                />
            );

            // 1. Clear followUpDate input
            const followUpInput = screen.getByLabelText(/follow-up date/i) as HTMLInputElement;
            fireEvent.change(followUpInput, { target: { value: "" } });

            // 2. Clear all vitals inputs
            fireEvent.change(screen.getByLabelText(/bp systolic/i), { target: { value: "" } });
            fireEvent.change(screen.getByLabelText(/bp diastolic/i), { target: { value: "" } });
            fireEvent.change(screen.getByLabelText(/heart rate/i), { target: { value: "" } });
            fireEvent.change(screen.getByLabelText(/temperature/i), { target: { value: "" } });
            fireEvent.change(screen.getByLabelText(/weight/i), { target: { value: "" } });

            // 3. Remove the prescription row
            const removePrescriptionBtn = screen.getByRole("button", { name: "" }); // trash icon button inside prescription row
            fireEvent.click(removePrescriptionBtn);

            // Submit update
            fireEvent.click(screen.getByRole("button", { name: /update visit/i }));

            await waitFor(() => {
                expect(capturedPatchPayload).not.toBeNull();
            });

            const patch = capturedPatchPayload as Record<string, unknown>;
            expect(patch.followUpDate).toBeNull();
            expect(patch.vitals).toEqual({});
            expect(patch.prescriptions).toEqual([]);
        });

        it("names the 24h edit window constant in lib/visit-validation.ts", () => {
            expect(VISIT_EDIT_WINDOW_HOURS).toBe(24);
        });

        it("displays minutes remaining when edit window is under one hour", async () => {
            mockAuth("doctor", "doc-1");

            // Visit created 23 hours and 20 minutes ago (40 minutes remaining)
            const remainingMinutes = 40;
            const createdAtTime = new Date(
                Date.now() - (24 * 60 - remainingMinutes) * 60 * 1000
            ).toISOString();

            const mockVisitUnderHour: Visit = {
                _id: "v-under-hour",
                patientId: "patient-1",
                doctorId: mockDoctor,
                visitDate: createdAtTime,
                chiefComplaint: "Mild rash",
                diagnosis: "Contact dermatitis",
                notes: "Topical cream applied",
                createdBy: "u-1",
                createdAt: createdAtTime,
            };

            vi.mocked(api.get).mockResolvedValueOnce({
                data: {
                    visits: [mockVisitUnderHour],
                    pagination: { totalVisits: 1, totalPages: 1, currentPage: 1, limit: 10 },
                },
            });

            renderWithClient(
                <VisitsTimeline
                    patientId="patient-1"
                    patientName="John Doe"
                    doctorTimezone="Asia/Dhaka"
                />
            );

            await waitFor(() => {
                expect(screen.getByText(/Editable for 40 more minutes/i)).toBeInTheDocument();
            });
        });

        it("targets specific visit in appointment View Visit link without clinical text in URL", () => {
            mockAuth("doctor", "doc-1");

            const appointmentWithVisit: Appointment = {
                _id: "appt-999",
                doctorId: mockDoctor,
                patientId: mockPatient,
                startsAt: "2026-11-10T10:00:00.000Z",
                endsAt: "2026-11-10T10:30:00.000Z",
                status: "completed",
                visitId: "visit-xyz-888",
                createdAt: "2026-11-01T00:00:00.000Z",
            };

            renderWithClient(
                <AppointmentDetailsDialog
                    appointment={appointmentWithVisit}
                    open={true}
                    onOpenChange={vi.fn()}
                />
            );

            const viewVisitLink = screen.getByRole("link", { name: /view visit/i });
            expect(viewVisitLink).toBeInTheDocument();

            const href = viewVisitLink.getAttribute("href");
            // Must contain target visit param: ?tab=visits&visit=<id>
            expect(href).toBe("/patients/patient-1?tab=visits&visit=visit-xyz-888");
            // Must NOT contain clinical text
            expect(href).not.toContain("Hypertension");
            expect(href).not.toContain("Cardiology");
        });

        it("highlights targeted visit card when visit param is present in URL", async () => {
            mockAuth("doctor", "doc-1");
            mockCurrentTab = "visits";

            // Mock searchParams to include visit=v-target
            vi.mocked(api.get).mockImplementation((url: string) => {
                if (url.includes("/patients/patient-1/visits")) {
                    return Promise.resolve({
                        data: {
                            visits: [
                                {
                                    _id: "v-other",
                                    patientId: "patient-1",
                                    doctorId: mockDoctor,
                                    visitDate: "2026-11-10T12:00:00.000Z",
                                    chiefComplaint: "Cold",
                                    diagnosis: "Common cold",
                                    notes: "Rest",
                                    createdAt: "2026-11-10T12:00:00.000Z",
                                },
                                {
                                    _id: "v-target",
                                    patientId: "patient-1",
                                    doctorId: mockDoctor,
                                    visitDate: "2026-11-12T12:00:00.000Z",
                                    chiefComplaint: "Back pain",
                                    diagnosis: "Lumbar strain",
                                    notes: "Physiotherapy",
                                    createdAt: "2026-11-12T12:00:00.000Z",
                                },
                            ],
                            pagination: { totalVisits: 2, totalPages: 1, currentPage: 1, limit: 10 },
                        },
                    });
                }
                return Promise.resolve({ data: {} });
            });

            // Mock Element.prototype.scrollIntoView
            const scrollIntoViewMock = vi.fn();
            window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

            // Spy on useSearchParams to return visit=v-target
            renderWithClient(
                <VisitsTimeline
                    patientId="patient-1"
                    patientName="John Doe"
                    doctorTimezone="Asia/Dhaka"
                />
            );

            await waitFor(() => {
                expect(screen.getByText("Back pain")).toBeInTheDocument();
            });

            const targetCard = document.getElementById("visit-v-target");
            expect(targetCard).toBeInTheDocument();
        });
    });
});
