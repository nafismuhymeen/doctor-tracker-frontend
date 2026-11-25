import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/components/providers/auth-provider";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { User } from "@/types";

interface MockApiModule {
    __getCapturedHandler: () => ((msg: string) => void) | null;
}

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
    useRouter: () => ({
        push: mockPush,
        replace: mockReplace,
    }),
}));

vi.mock("sonner", () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn(),
    },
}));

vi.mock("@/lib/api", async () => {
    let capturedHandler: ((msg: string) => void) | null = null;
    return {
        api: {
            get: vi.fn(),
            post: vi.fn(),
            patch: vi.fn(),
            delete: vi.fn(),
        },
        setSessionExpiredHandler: vi.fn((handler) => {
            capturedHandler = handler;
        }),
        __getCapturedHandler: () => capturedHandler,
    };
});

function TestConsumer({ onMount }: { onMount?: (auth: ReturnType<typeof useAuth>) => void }) {
    const auth = useAuth();
    React.useEffect(() => {
        onMount?.(auth);
    }, [auth, onMount]);

    return (
        <div>
            <span data-testid="auth-loading">{auth.isLoading ? "loading" : "loaded"}</span>
            <span data-testid="auth-status">{auth.isAuthenticated ? "authenticated" : "unauthenticated"}</span>
            <span data-testid="auth-user">{auth.user?.name ?? "no-user"}</span>
            <button onClick={() => auth.logout()} data-testid="logout-btn">
                Logout
            </button>
            <button
                onClick={() =>
                    auth.login({
                        id: "u-1",
                        name: "Dr. Alice",
                        email: "alice@hospital.org",
                        role: "doctor",
                        doctorId: "doc-1",
                    })
                }
                data-testid="login-btn"
            >
                Login
            </button>
        </div>
    );
}

function renderWithClient(ui: React.ReactElement) {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
        },
    });
    return render(
        <QueryClientProvider client={queryClient}>
            <AuthProvider>{ui}</AuthProvider>
        </QueryClientProvider>
    );
}

describe("AuthProvider Session Lifecycle & Expiration Guard", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("remains silent on unauthenticated startup (no toast, no redirect loop)", async () => {
        // Startup /auth/me returns 401 rejection
        vi.mocked(api.get).mockRejectedValueOnce({ status: 401, message: "Unauthorized" });

        renderWithClient(<TestConsumer />);

        await waitFor(() => {
            expect(screen.getByTestId("auth-loading").textContent).toBe("loaded");
        });

        expect(screen.getByTestId("auth-status").textContent).toBe("unauthenticated");

        // If an expired session handler event arrives when never signed in:
        const { __getCapturedHandler } = (await import("@/lib/api")) as unknown as MockApiModule;
        const handler = __getCapturedHandler();
        expect(handler).toBeDefined();

        act(() => {
            handler?.("Your session expired, please sign in again");
        });

        // Must NOT toast or redirect because user was never signed in
        expect(toast.error).not.toHaveBeenCalled();
        expect(mockPush).not.toHaveBeenCalled();
    });

    it("remains silent when /auth/me is refetched after intentional logout", async () => {
        const dummyUser: User = {
            id: "u-2",
            name: "Staff Bob",
            email: "bob@hospital.org",
            role: "staff",
        };

        vi.mocked(api.get).mockResolvedValueOnce({
            success: true,
            data: { user: dummyUser },
        });
        vi.mocked(api.post).mockResolvedValueOnce({ success: true });

        renderWithClient(<TestConsumer />);

        await waitFor(() => {
            expect(screen.getByTestId("auth-user").textContent).toBe("Staff Bob");
        });

        // Intentional logout
        act(() => {
            screen.getByTestId("logout-btn").click();
        });

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith("/login");
        });

        // Clear push mock to isolate post-logout events
        mockPush.mockClear();

        // Any subsequent session expiration event after intentional logout must be silent
        const { __getCapturedHandler } = (await import("@/lib/api")) as unknown as MockApiModule;
        const handler = __getCapturedHandler();

        act(() => {
            handler?.("Your session expired, please sign in again");
        });

        expect(toast.error).not.toHaveBeenCalled();
        expect(mockPush).not.toHaveBeenCalled();
    });

    it("triggers toast and redirects to /login when an active session expires mid-use", async () => {
        const dummyUser: User = {
            id: "u-3",
            name: "Admin Charlie",
            email: "charlie@hospital.org",
            role: "admin",
        };

        vi.mocked(api.get).mockResolvedValueOnce({
            success: true,
            data: { user: dummyUser },
        });

        renderWithClient(<TestConsumer />);

        await waitFor(() => {
            expect(screen.getByTestId("auth-user").textContent).toBe("Admin Charlie");
        });

        // While active, mid-use session expiration arrives (e.g. refresh token revoked on server)
        const { __getCapturedHandler } = (await import("@/lib/api")) as unknown as MockApiModule;
        const handler = __getCapturedHandler();

        act(() => {
            handler?.("Your session expired, please sign in again");
        });

        expect(toast.error).toHaveBeenCalledWith(
            "Your session expired, please sign in again"
        );
        expect(mockPush).toHaveBeenCalledWith("/login");
    });
});
