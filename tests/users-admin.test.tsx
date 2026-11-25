import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import UsersPage from "@/app/(app)/users/page";
import { CreateUserDialog } from "@/components/users/create-user-dialog";
import { EditUserDialog } from "@/components/users/edit-user-dialog";
import * as AuthProviderModule from "@/components/providers/auth-provider";
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";
import type { AppUser, Role, User } from "@/types";

vi.mock("next/navigation", () => ({
    useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
    }),
    usePathname: () => "/users",
}));

vi.mock("sonner", () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn(),
    },
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

describe("CreateUserDialog Error Code Mapping", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(api.get).mockResolvedValue({ success: true, data: { doctors: [] } });
    });

    it("maps EMAIL_IN_USE code specifically, and does not swallow DOCTOR_ALREADY_ASSIGNED", async () => {
        vi.mocked(api.post).mockRejectedValueOnce(
            new ApiError("Email in use error", 409, "EMAIL_IN_USE")
        );

        renderWithClient(<CreateUserDialog />);

        // Open dialog
        fireEvent.click(screen.getByRole("button", { name: /^Create User$/i }));

        // Fill form
        fireEvent.change(screen.getByLabelText(/Full Name/i), {
            target: { value: "John Doe" },
        });
        fireEvent.change(screen.getByLabelText(/Email Address/i), {
            target: { value: "john@hospital.org" },
        });
        fireEvent.change(screen.getByLabelText(/Initial Password/i), {
            target: { value: "ValidPassword123" },
        });

        // Submit form
        const submitBtn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
        expect(submitBtn).toBeInTheDocument();
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Registration Failed", {
                description: "This email address is already in use by another account.",
            });
        });

        // Now test DOCTOR_ALREADY_ASSIGNED
        vi.mocked(api.post).mockRejectedValueOnce(
            new ApiError("Doctor already assigned", 409, "DOCTOR_ALREADY_ASSIGNED")
        );

        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Registration Failed", {
                description: "This doctor record is already linked to another user account.",
            });
        });
    });
});

describe("EditUserDialog Error Code Mapping", () => {
    const targetStaffUser: AppUser = {
        id: "target-user-2",
        name: "Staff Dave",
        email: "dave@hospital.org",
        role: "staff",
        isActive: true,
        tokenVersion: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockAuthWithRole("admin", "admin-1");
        vi.mocked(api.get).mockResolvedValue({ success: true, data: { doctors: [] } });
    });

    it("maps LAST_ADMIN code specifically", async () => {
        vi.mocked(api.patch).mockRejectedValueOnce(
            new ApiError("Last admin cannot be demoted", 409, "LAST_ADMIN")
        );

        renderWithClient(
            <EditUserDialog
                user={targetStaffUser}
                open={true}
                onOpenChange={vi.fn()}
            />
        );

        fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Update Blocked", {
                description: "At least one active administrator is required.",
            });
        });
    });

    it("maps DOCTOR_ALREADY_ASSIGNED code specifically", async () => {
        vi.mocked(api.patch).mockRejectedValueOnce(
            new ApiError("Doctor assigned", 409, "DOCTOR_ALREADY_ASSIGNED")
        );

        renderWithClient(
            <EditUserDialog
                user={targetStaffUser}
                open={true}
                onOpenChange={vi.fn()}
            />
        );

        fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Update Blocked", {
                description: "This doctor record is already linked to another user account.",
            });
        });
    });

    it("maps CANNOT_DEMOTE_SELF and CANNOT_DEACTIVATE_SELF code specifically", async () => {
        vi.mocked(api.patch).mockRejectedValueOnce(
            new ApiError("Cannot demote yourself", 400, "CANNOT_DEMOTE_SELF")
        );

        renderWithClient(
            <EditUserDialog
                user={targetStaffUser}
                open={true}
                onOpenChange={vi.fn()}
            />
        );

        fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Action Prohibited", {
                description: "You cannot change the role or deactivate your own account.",
            });
        });
    });
});
