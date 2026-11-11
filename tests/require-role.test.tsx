import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { RequireRole } from "@/components/auth/require-role";
import * as AuthProviderModule from "@/components/providers/auth-provider";
import type { User } from "@/types";

const mockPush = vi.fn();
let currentPathname = "/doctors";

vi.mock("next/navigation", () => ({
    useRouter: () => ({
        push: mockPush,
        replace: vi.fn(),
    }),
    usePathname: () => currentPathname,
}));

function mockAuth(overrides: Partial<ReturnType<typeof AuthProviderModule.useAuth>>) {
    vi.spyOn(AuthProviderModule, "useAuth").mockReturnValue({
        user: null,
        role: null,
        isLoading: false,
        isAuthenticated: false,
        login: vi.fn(),
        logout: vi.fn(),
        logoutAll: vi.fn(),
        can: vi.fn(() => false),
        ...overrides,
    });
}

describe("RequireRole Route & Component Guard", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        currentPathname = "/doctors";
    });

    it("renders loading indicator when auth is verifying", () => {
        mockAuth({ isLoading: true });

        render(
            <RequireRole>
                <div>Protected Secret Content</div>
            </RequireRole>
        );

        expect(screen.getByText("Checking credentials...")).toBeInTheDocument();
        expect(screen.queryByText("Protected Secret Content")).not.toBeInTheDocument();
    });

    it("redirects unauthenticated users to /login?next=...", () => {
        currentPathname = "/patients/edit?id=123";
        mockAuth({ isLoading: false, isAuthenticated: false, user: null });

        const { container } = render(
            <RequireRole>
                <div>Protected Secret Content</div>
            </RequireRole>
        );

        expect(mockPush).toHaveBeenCalledWith("/login?next=%2Fpatients%2Fedit%3Fid%3D123");
        expect(container.firstChild).toBeNull();
    });

    it("renders protected children when authenticated and permitted", () => {
        const user: User = {
            id: "u-1",
            name: "Dr. Admin",
            email: "admin@hospital.org",
            role: "admin",
        };
        mockAuth({
            isLoading: false,
            isAuthenticated: true,
            user,
            role: "admin",
        });

        render(
            <RequireRole action="doctors.create">
                <div data-testid="secret">Admin Only Creation Tool</div>
            </RequireRole>
        );

        expect(screen.getByTestId("secret")).toBeInTheDocument();
        expect(screen.queryByText("Access Denied")).not.toBeInTheDocument();
    });

    it("displays an Access Denied card with role name when unauthorized", () => {
        const user: User = {
            id: "u-2",
            name: "ReadOnly Viewer",
            email: "viewer@hospital.org",
            role: "viewer",
        };
        mockAuth({
            isLoading: false,
            isAuthenticated: true,
            user,
            role: "viewer",
        });

        render(
            <RequireRole action="doctors.create">
                <div data-testid="secret">Admin Only Creation Tool</div>
            </RequireRole>
        );

        expect(screen.queryByTestId("secret")).not.toBeInTheDocument();
        expect(screen.getByText("Access Denied")).toBeInTheDocument();
        expect(screen.getByText("viewer")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /Return to Dashboard/i })).toBeInTheDocument();
    });
});
