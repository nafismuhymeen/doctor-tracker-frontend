import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import UsersPage from "@/app/(app)/users/page";
import * as AuthProviderModule from "@/components/providers/auth-provider";
import { api } from "@/lib/api";
import type { AppUser, Role, User } from "@/types";

vi.mock("next/navigation", () => ({
    useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
    }),
    usePathname: () => "/users",
}));

vi.mock("@/lib/api", () => ({
    api: {
        get: vi.fn(),
        post: vi.fn(),
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

function mockAuthWithRole(role: Role, userId = "admin-1") {
    const user: User = {
        id: userId,
        name: `Current ${role}`,
        email: `${role}@hospital.org`,
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
        can: () => (role === "admin" ? true : false),
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

const mockUsers: AppUser[] = [
    {
        id: "admin-1",
        name: "Admin Alice",
        email: "alice@hospital.org",
        role: "admin",
        isActive: true,
        tokenVersion: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: "staff-2",
        name: "Staff Bob",
        email: "bob@hospital.org",
        role: "staff",
        isActive: true,
        tokenVersion: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
];

describe("Users Admin Page Access & Self-Protection", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(api.get).mockResolvedValue({
            success: true,
            data: { users: [], doctors: [] },
        });
    });

    it("renders Access Denied for non-admin roles", () => {
        mockAuthWithRole("staff");

        renderWithClient(<UsersPage />);

        expect(screen.getByText("Access Denied")).toBeInTheDocument();
        expect(screen.queryByText("User Management")).not.toBeInTheDocument();
    });

    it("renders user table for admin role with self indicator", async () => {
        mockAuthWithRole("admin", "admin-1");

        vi.mocked(api.get).mockImplementation(async (url: string) => {
            if (url.startsWith("/users")) {
                return {
                    success: true,
                    data: {
                        users: mockUsers,
                        pagination: {
                            totalUsers: 2,
                            currentPage: 1,
                            totalPages: 1,
                            limit: 10,
                            hasNextPage: false,
                            hasPreviousPage: false,
                        },
                    },
                };
            }
            if (url.startsWith("/doctors")) {
                return { success: true, data: { doctors: [] } };
            }
            return { success: true, data: {} };
        });

        renderWithClient(<UsersPage />);

        expect(screen.getByText("User Management")).toBeInTheDocument();
        expect(await screen.findByText("Admin Alice")).toBeInTheDocument();
        expect(await screen.findByText("Staff Bob")).toBeInTheDocument();
        // Self indicator
        expect(screen.getByText("You")).toBeInTheDocument();
    });
});
