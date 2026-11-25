// @vitest-environment jsdom
// Set timezone to America/New_York (UTC-5 in standard time)
process.env.TZ = "America/New_York";

import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AuditPage from "@/app/(app)/audit/page";
import { AuditDiffViewer } from "@/components/audit/audit-diff-viewer";
import { localDateToUtcIso } from "@/lib/audit-utils";
import * as AuthProviderModule from "@/components/providers/auth-provider";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/layout/sidebar";
import { EntityHistoryDrawer } from "@/components/audit/entity-history-drawer";
import type { AuditLog, AuditLogsResponse, ApiResponse, UsersResponse } from "@/types";

let mockSearchParams = new URLSearchParams();
const mockRouterReplace = vi.fn();
const mockRouterPush = vi.fn();

vi.mock("next/navigation", () => ({
    useRouter: () => ({
        push: mockRouterPush,
        replace: mockRouterReplace,
    }),
    usePathname: () => "/audit",
    useSearchParams: () => mockSearchParams,
    useParams: () => ({ id: "patient-1" }),
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

function createTestQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: { retry: false, gcTime: 0 },
        },
    });
}

function renderWithClient(ui: React.ReactElement, client = createTestQueryClient()) {
    return render(
        <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    );
}

const mockLogs: AuditLog[] = [
    {
        _id: "log-1",
        actorId: "user-admin-1",
        actorRole: "admin",
        actorEmail: "admin@example.com",
        action: "auth.login.success",
        entityType: "Auth",
        outcome: "success",
        metadata: {
            ip: "127.0.0.1",
            userAgent: "Mozilla/5.0",
            requestId: "req-1",
        },
        createdAt: "2026-11-15T15:00:00.000Z",
    },
    {
        _id: "log-2",
        actorId: "user-doctor-1",
        actorRole: "doctor",
        actorEmail: "doctor@example.com",
        action: "patient.update",
        entityType: "Patient",
        entityId: "patient-123",
        outcome: "success",
        changes: [
            { field: "phone", from: "[redacted]", to: "[redacted]" },
            { field: "name", from: "Jane", to: "Jane Doe" },
            { field: "status", from: null, to: "active" },
            { field: "description", from: undefined, to: "A".repeat(200) },
        ],
        metadata: {
            ip: "192.168.1.1",
            requestId: "req-2",
        },
        createdAt: "2026-11-15T16:00:00.000Z",
    },
    {
        _id: "log-3",
        action: "auth.login.failure",
        outcome: "failure",
        metadata: {
            ip: "10.0.0.1",
            reason: "Invalid credentials",
        },
        createdAt: "2026-11-15T17:00:00.000Z",
    },
];

describe("Phase F5: Audit Log Viewer", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSearchParams = new URLSearchParams();

        vi.spyOn(api, "get").mockImplementation(async (url: string) => {
            if (url.includes("/users")) {
                return {
                    success: true,
                    data: {
                        users: [
                            { id: "user-admin-1", name: "Admin User", email: "admin@example.com", role: "admin", isActive: true },
                        ],
                        pagination: { currentPage: 1, limit: 100, totalUsers: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
                    },
                } as unknown as ApiResponse<UsersResponse>;
            }
            if (url.startsWith("/audit/log-2")) {
                return {
                    success: true,
                    data: { log: mockLogs[1] },
                } as unknown as ApiResponse<{ log: AuditLog }>;
            }
            return {
                success: true,
                data: {
                    logs: mockLogs,
                    pagination: {
                        currentPage: 1,
                        limit: 20,
                        totalAuditLogs: 3,
                        totalPages: 1,
                        hasNextPage: false,
                        hasPreviousPage: false,
                    },
                },
            } as ApiResponse<AuditLogsResponse>;
        });
    });

    describe("1. Access Control (Admin Only)", () => {
        it("denies access to non-admin roles (doctor, staff, viewer)", () => {
            vi.spyOn(AuthProviderModule, "useAuth").mockReturnValue({
                user: { id: "doc-1", name: "Doctor", email: "doc@example.com", role: "doctor" },
                role: "doctor",
                isAuthenticated: true,
                isLoading: false,
                login: vi.fn(),
                logout: vi.fn(),
                logoutAll: vi.fn(),
                can: () => false,
            });

            renderWithClient(<AuditPage />);
            expect(screen.getByText(/access denied/i)).toBeInTheDocument();
            expect(screen.queryByText(/system security trail/i)).not.toBeInTheDocument();
        });

        it("allows admin to view audit logs", async () => {
            vi.spyOn(AuthProviderModule, "useAuth").mockReturnValue({
                user: { id: "admin-1", name: "Admin", email: "admin@example.com", role: "admin" },
                role: "admin",
                isAuthenticated: true,
                isLoading: false,
                login: vi.fn(),
                logout: vi.fn(),
                logoutAll: vi.fn(),
                can: () => true,
            });

            renderWithClient(<AuditPage />);
            expect(await screen.findByRole("heading", { name: /audit logs/i })).toBeInTheDocument();
            expect(screen.getByText(/system security trail/i)).toBeInTheDocument();
        });

        it("shows Audit Logs in Sidebar for admin and hides for other roles", () => {
            // Admin
            vi.spyOn(AuthProviderModule, "useAuth").mockReturnValue({
                user: { id: "admin-1", name: "Admin", email: "admin@example.com", role: "admin" },
                role: "admin",
                isAuthenticated: true,
                isLoading: false,
                login: vi.fn(),
                logout: vi.fn(),
                logoutAll: vi.fn(),
                can: (action: string) => action === "audit.view" || true,
            });
            const { rerender } = renderWithClient(<Sidebar />);
            expect(screen.getByText("Audit Logs")).toBeInTheDocument();

            // Doctor
            vi.spyOn(AuthProviderModule, "useAuth").mockReturnValue({
                user: { id: "doc-1", name: "Doctor", email: "doc@example.com", role: "doctor" },
                role: "doctor",
                isAuthenticated: true,
                isLoading: false,
                login: vi.fn(),
                logout: vi.fn(),
                logoutAll: vi.fn(),
                can: (action: string) => action !== "audit.view",
            });
            rerender(<QueryClientProvider client={createTestQueryClient()}><Sidebar /></QueryClientProvider>);
            expect(screen.queryByText("Audit Logs")).not.toBeInTheDocument();
        });
    });

    describe("2. Local Timezone Date Interpretation (America/New_York)", () => {
        it("correctly converts local yyyy-MM-dd to UTC ISO boundary in America/New_York (UTC-5)", () => {
            // In America/New_York (UTC-5 in November standard time):
            // 2026-11-15 00:00:00.000 local is 2026-11-15T05:00:00.000Z
            const utcStart = localDateToUtcIso("2026-11-15", "start");
            expect(utcStart).toBe("2026-11-15T05:00:00.000Z");

            // 2026-11-15 23:59:59.999 local is 2026-11-16T04:59:59.999Z
            const utcEnd = localDateToUtcIso("2026-11-15", "end");
            expect(utcEnd).toBe("2026-11-16T04:59:59.999Z");
        });

        it("sends UTC ISO bounds in API request when from and to filters are set", async () => {
            mockSearchParams = new URLSearchParams("from=2026-11-15&to=2026-11-15");

            vi.spyOn(AuthProviderModule, "useAuth").mockReturnValue({
                user: { id: "admin-1", name: "Admin", email: "admin@example.com", role: "admin" },
                role: "admin",
                isAuthenticated: true,
                isLoading: false,
                login: vi.fn(),
                logout: vi.fn(),
                logoutAll: vi.fn(),
                can: () => true,
            });

            renderWithClient(<AuditPage />);

            await waitFor(() => {
                expect(api.get).toHaveBeenCalledWith(
                    expect.stringContaining("from=2026-11-15T05%3A00%3A00.000Z")
                );
                expect(api.get).toHaveBeenCalledWith(
                    expect.stringContaining("to=2026-11-16T04%3A59%3A59.999Z")
                );
            });
        });
    });

    describe("3. Filter Presets and URL Synchronization", () => {
        beforeEach(() => {
            vi.spyOn(AuthProviderModule, "useAuth").mockReturnValue({
                user: { id: "admin-1", name: "Admin", email: "admin@example.com", role: "admin" },
                role: "admin",
                isAuthenticated: true,
                isLoading: false,
                login: vi.fn(),
                logout: vi.fn(),
                logoutAll: vi.fn(),
                can: () => true,
            });
        });

        it("clicking 'Failed logins' preset sets action=auth.login.failure and outcome=failure", async () => {
            renderWithClient(<AuditPage />);

            const failedLoginsBtn = screen.getByRole("button", { name: /failed logins/i });
            fireEvent.click(failedLoginsBtn);

            expect(mockRouterReplace).toHaveBeenCalledWith(
                "/audit?action=auth.login.failure&outcome=failure"
            );
        });

        it("clicking 'Access denied' preset sets action=access.denied and outcome=failure", async () => {
            renderWithClient(<AuditPage />);

            const accessDeniedBtn = screen.getByRole("button", { name: /access denied/i });
            fireEvent.click(accessDeniedBtn);

            expect(mockRouterReplace).toHaveBeenCalledWith(
                "/audit?action=access.denied&outcome=failure"
            );
        });

        it("clicking 'Clinical record reads' preset sets action=visit.read", async () => {
            renderWithClient(<AuditPage />);

            const clinicalReadsBtn = screen.getByRole("button", { name: /clinical record reads/i });
            fireEvent.click(clinicalReadsBtn);

            expect(mockRouterReplace).toHaveBeenCalledWith(
                "/audit?action=visit.read"
            );
        });

        it("handles invalid search params gracefully without crashing", async () => {
            mockSearchParams = new URLSearchParams("page=-5&outcome=bogusOutcome");

            renderWithClient(<AuditPage />);

            // Page defaults to 1, outcome ignored
            await waitFor(() => {
                expect(api.get).toHaveBeenCalledWith(
                    expect.stringContaining("page=1")
                );
            });
            expect(screen.queryByText("bogusOutcome")).not.toBeInTheDocument();
        });
    });

    describe("4. Diff Viewer and Redaction", () => {
        it("renders '[redacted]' values with Redacted chip and tooltip explanation", () => {
            render(
                <AuditDiffViewer
                    changes={[
                        { field: "phone", from: "[redacted]", to: "[redacted]" },
                    ]}
                />
            );

            const chips = screen.getAllByText("Redacted");
            expect(chips.length).toBe(2);
            expect(chips[0].getAttribute("title")).toBe("PII is not stored in the audit log");
        });

        it("renders null and undefined values as italicized 'none'", () => {
            render(
                <AuditDiffViewer
                    changes={[
                        { field: "notes", from: null, to: undefined },
                    ]}
                />
            );

            const noneLabels = screen.getAllByText("none");
            expect(noneLabels.length).toBe(2);
        });

        it("handles very long strings with break-all without overflowing layout", () => {
            const longStr = "X".repeat(300);
            render(
                <AuditDiffViewer
                    changes={[
                        { field: "longField", from: "start", to: longStr },
                    ]}
                />
            );

            const longEl = screen.getByText(longStr);
            expect(longEl.className).toContain("break-all");
        });
    });

    describe("5. Append-Only Integrity", () => {
        it("ensures there are no edit or delete controls anywhere in the audit log table or page", async () => {
            vi.spyOn(AuthProviderModule, "useAuth").mockReturnValue({
                user: { id: "admin-1", name: "Admin", email: "admin@example.com", role: "admin" },
                role: "admin",
                isAuthenticated: true,
                isLoading: false,
                login: vi.fn(),
                logout: vi.fn(),
                logoutAll: vi.fn(),
                can: () => true,
            });

            renderWithClient(<AuditPage />);
            await screen.findByRole("heading", { name: /audit logs/i });

            expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument();
            expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
            expect(screen.getByText(/append-only/i)).toBeInTheDocument();
        });
    });

    describe("6. Entity History Drawer", () => {
        it("renders history events for a given entity and links to full audit log", async () => {
            const onOpenChange = vi.fn();
            renderWithClient(
                <EntityHistoryDrawer
                    entityType="Doctor"
                    entityId="doc-123"
                    entityName="Dr. House"
                    open={true}
                    onOpenChange={onOpenChange}
                />
            );

            expect(await screen.findByText(/audit history: doctor/i)).toBeInTheDocument();
            expect(screen.getByText(/Dr\. House/i)).toBeInTheDocument();

            // Link to filtered audit log
            const viewAllLink = await screen.findByRole("link", { name: /view all in audit log/i });
            expect(viewAllLink.getAttribute("href")).toBe("/audit?entityType=Doctor&entityId=doc-123");
        });
    });
});
