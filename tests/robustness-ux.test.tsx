// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OfflineBanner } from "@/components/layout/offline-banner";
import { CommandPalette } from "@/components/layout/command-palette";
import RootError from "@/app/error";
import AppRouteError from "@/app/(app)/error";
import GlobalError from "@/app/global-error";
import NotFound from "@/app/not-found";
import AppNotFound from "@/app/(app)/not-found";
import * as AuthProviderModule from "@/components/providers/auth-provider";
import { api, API_URL } from "@/lib/api";

const mockRouterPush = vi.fn();
vi.mock("next/navigation", () => ({
    useRouter: () => ({
        push: mockRouterPush,
        replace: vi.fn(),
    }),
    usePathname: () => "/dashboard",
    useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/api", async () => {
    const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
    return {
        ...actual,
        api: {
            get: vi.fn(),
        },
    };
});

function createTestClient() {
    return new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
}

function renderWithClient(ui: React.ReactElement, client = createTestClient()) {
    return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("Phase F6-A & F6-B: Robustness and UX Polish", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("1. Offline Network Status Banner", () => {
        it("does not render when online", () => {
            Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });
            render(<OfflineBanner />);
            expect(screen.queryByRole("status")).not.toBeInTheDocument();
        });

        it("renders sticky banner when offline event fires and hides when online event fires", async () => {
            render(<OfflineBanner />);

            // Trigger offline
            act(() => {
                window.dispatchEvent(new Event("offline"));
            });

            expect(screen.getByRole("status")).toBeInTheDocument();
            expect(screen.getByText(/offline mode/i)).toBeInTheDocument();

            // Trigger online
            act(() => {
                window.dispatchEvent(new Event("online"));
            });

            expect(screen.queryByRole("status")).not.toBeInTheDocument();
        });

        it("checkConnection treats any HTTP response (e.g. 401) as reachable", async () => {
            const originalFetch = global.fetch;
            global.fetch = vi.fn().mockResolvedValue({
                status: 401,
                ok: false,
            });

            render(<OfflineBanner />);

            // Switch to offline
            act(() => {
                window.dispatchEvent(new Event("offline"));
            });
            expect(screen.getByRole("status")).toBeInTheDocument();

            // Click Reconnect button
            const reconnectBtn = screen.getByRole("button", { name: /reconnect/i });
            await act(async () => {
                fireEvent.click(reconnectBtn);
            });

            expect(global.fetch).toHaveBeenCalledWith(
                `${API_URL}/auth/me`,
                expect.objectContaining({ method: "HEAD" })
            );

            // Banner should disappear because server responded (reachable)
            expect(screen.queryByRole("status")).not.toBeInTheDocument();

            global.fetch = originalFetch;
        });

        it("checkConnection treats thrown network failure as unreachable", async () => {
            const originalFetch = global.fetch;
            global.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

            render(<OfflineBanner />);

            // Switch to offline
            act(() => {
                window.dispatchEvent(new Event("offline"));
            });
            expect(screen.getByRole("status")).toBeInTheDocument();

            // Click Reconnect button
            const reconnectBtn = screen.getByRole("button", { name: /reconnect/i });
            await act(async () => {
                fireEvent.click(reconnectBtn);
            });

            // Banner remains visible because network failed
            expect(screen.getByRole("status")).toBeInTheDocument();

            global.fetch = originalFetch;
        });
    });

    describe("2. Command Palette (Cmd/Ctrl+K)", () => {
        it("toggles open when Cmd+K or Ctrl+K is pressed", async () => {
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

            renderWithClient(<CommandPalette />);

            // Palette is closed initially
            expect(screen.queryByPlaceholderText(/type a command/i)).not.toBeInTheDocument();

            // Trigger Cmd+K
            act(() => {
                window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
            });

            expect(await screen.findByPlaceholderText(/type a command/i)).toBeInTheDocument();
        });

        it("displays role-aware navigation options", async () => {
            // Admin role sees User Management and Audit Logs
            vi.spyOn(AuthProviderModule, "useAuth").mockReturnValue({
                user: { id: "admin-1", name: "Admin", email: "admin@example.com", role: "admin" },
                role: "admin",
                isAuthenticated: true,
                isLoading: false,
                login: vi.fn(),
                logout: vi.fn(),
                logoutAll: vi.fn(),
                can: (action: string) => action === "users.manage" || action === "audit.view",
            });

            renderWithClient(<CommandPalette open={true} onOpenChange={vi.fn()} />);

            expect(screen.getByText("Dashboard")).toBeInTheDocument();
            expect(screen.getByText("Doctors Directory")).toBeInTheDocument();
            expect(screen.getByText("Patients List")).toBeInTheDocument();
            expect(screen.getByText("Appointments Calendar")).toBeInTheDocument();
            expect(screen.getByText("User Management")).toBeInTheDocument();
            expect(screen.getByText("Audit Logs")).toBeInTheDocument();
        });

        it("hides admin routes from doctor role", async () => {
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

            renderWithClient(<CommandPalette open={true} onOpenChange={vi.fn()} />);

            expect(screen.getByText("Dashboard")).toBeInTheDocument();
            expect(screen.queryByText("User Management")).not.toBeInTheDocument();
            expect(screen.queryByText("Audit Logs")).not.toBeInTheDocument();
        });

        it("searches doctors and patients when typing 2+ characters", async () => {
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

            vi.spyOn(api, "get").mockImplementation(async (url: string) => {
                if (url.includes("/doctors?search=rah")) {
                    return {
                        success: true,
                        data: {
                            doctors: [
                                { _id: "doc-1", name: "Dr. Rahman", specialization: "Cardiology", hospital: "Dhaka Hospital", timezone: "Asia/Dhaka", slotMinutes: 30, workingHours: [] },
                            ],
                            pagination: { currentPage: 1, limit: 5, totalDoctors: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
                        },
                    };
                }
                if (url.includes("/patients?search=rah")) {
                    return {
                        success: true,
                        data: {
                            patients: [
                                { _id: "pat-1", name: "Rahim Ali", age: 35, gender: "male", phone: "01700000000", doctorId: "doc-1" },
                            ],
                            pagination: { currentPage: 1, limit: 5, totalPatients: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
                        },
                    };
                }
                return { success: true, data: { doctors: [], patients: [] } };
            });

            renderWithClient(<CommandPalette open={true} onOpenChange={vi.fn()} />);

            const input = screen.getByPlaceholderText(/type a command/i);
            fireEvent.change(input, { target: { value: "rah" } });

            expect(await screen.findByText("Dr. Rahman")).toBeInTheDocument();
            expect(await screen.findByText("Rahim Ali")).toBeInTheDocument();

            // Clicking a doctor result navigates to doctor detail
            fireEvent.click(screen.getByText("Dr. Rahman"));
            expect(mockRouterPush).toHaveBeenCalledWith("/doctors/doc-1");
        });
    });

    describe("3. Error Boundaries & Not-Found Pages", () => {
        it("RootError renders error message in development and provides retry action", () => {
            vi.stubEnv("NODE_ENV", "development");

            const resetFn = vi.fn();
            render(<RootError error={new Error("Network breakdown")} reset={resetFn} />);

            expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
            expect(screen.getByText(/network breakdown/i)).toBeInTheDocument();

            const retryBtn = screen.getByRole("button", { name: /try again/i });
            fireEvent.click(retryBtn);
            expect(resetFn).toHaveBeenCalled();

            vi.unstubAllEnvs();
        });

        it("RootError masks error message in production and renders digest", () => {
            vi.stubEnv("NODE_ENV", "production");

            const err = new Error("Database password leaked in message") as Error & { digest?: string };
            err.digest = "DIGEST-789";

            render(<RootError error={err} reset={vi.fn()} />);

            // Sensitive message is masked
            expect(screen.queryByText(/database password/i)).not.toBeInTheDocument();
            expect(screen.getByText(/an unexpected error occurred/i)).toBeInTheDocument();
            expect(screen.getByText(/error reference: DIGEST-789/i)).toBeInTheDocument();

            vi.unstubAllEnvs();
        });

        it("AppRouteError masks message in production and renders digest", () => {
            vi.stubEnv("NODE_ENV", "production");

            const err = new Error("Internal secret query") as Error & { digest?: string };
            err.digest = "DIGEST-APP-123";

            render(<AppRouteError error={err} reset={vi.fn()} />);

            expect(screen.queryByText(/internal secret/i)).not.toBeInTheDocument();
            expect(screen.getByText(/an unexpected error occurred/i)).toBeInTheDocument();
            expect(screen.getByText(/error reference: DIGEST-APP-123/i)).toBeInTheDocument();

            vi.unstubAllEnvs();
        });

        it("GlobalError masks message in production and renders digest", () => {
            vi.stubEnv("NODE_ENV", "production");

            const err = new Error("Layout root fail") as Error & { digest?: string };
            err.digest = "DIGEST-GLOB-456";

            render(<GlobalError error={err} reset={vi.fn()} />);

            expect(screen.queryByText(/layout root fail/i)).not.toBeInTheDocument();
            expect(screen.getByRole("heading", { name: /critical system error/i })).toBeInTheDocument();
            expect(screen.getByText(/error reference: DIGEST-GLOB-456/i)).toBeInTheDocument();

            vi.unstubAllEnvs();
        });

        it("NotFound renders 404 message and home link", () => {
            render(<NotFound />);
            expect(screen.getByText(/404 - page not found/i)).toBeInTheDocument();
            expect(screen.getByRole("link", { name: /to dashboard/i })).toBeInTheDocument();
        });

        it("AppNotFound renders resource not found message and back button", () => {
            render(<AppNotFound />);
            expect(screen.getByText(/resource not found/i)).toBeInTheDocument();
            expect(screen.getByRole("link", { name: /return to dashboard/i })).toBeInTheDocument();
        });
    });
});
