import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "@/components/layout/sidebar";
import * as AuthProviderModule from "@/components/providers/auth-provider";
import { can as canPermission } from "@/lib/permissions";
import type { Role, User } from "@/types";

vi.mock("next/navigation", () => ({
    usePathname: () => "/dashboard",
}));

function mockAuthWithRole(role: Role) {
    const user: User = {
        id: "u-10",
        name: `User ${role}`,
        email: `${role}@hospital.org`,
        role,
        doctorId: role === "doctor" ? "doc-10" : undefined,
    };

    vi.spyOn(AuthProviderModule, "useAuth").mockReturnValue({
        user,
        role,
        isLoading: false,
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn(),
        logoutAll: vi.fn(),
        can: (action, ctx) =>
            canPermission(role, action, {
                ...ctx,
                doctorId: user.doctorId,
            }),
    });
}

describe("Sidebar Navigation & Role Portal Visibility", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const roles: Array<{ role: Role; expectedTitle: string }> = [
        { role: "admin", expectedTitle: "Admin Portal" },
        { role: "staff", expectedTitle: "Staff Portal" },
        { role: "doctor", expectedTitle: "Doctor Portal" },
        { role: "viewer", expectedTitle: "Viewer Portal" },
    ];

    roles.forEach(({ role, expectedTitle }) => {
        it(`renders correct portal header and allowed links for role: ${role}`, () => {
            mockAuthWithRole(role);

            render(<Sidebar />);

            // Check portal title
            expect(screen.getByText(expectedTitle)).toBeInTheDocument();

            // All 4 roles currently have read access to Dashboard, Doctors, Patients, and Appointments
            expect(screen.getByRole("link", { name: /Dashboard/i })).toBeInTheDocument();
            expect(screen.getByRole("link", { name: /Doctors/i })).toBeInTheDocument();
            expect(screen.getByRole("link", { name: /Patients/i })).toBeInTheDocument();
            expect(screen.getByRole("link", { name: /Appointments/i })).toBeInTheDocument();

            // Users management is visible strictly to admin
            if (role === "admin") {
                expect(screen.getByRole("link", { name: /Users/i })).toBeInTheDocument();
            } else {
                expect(screen.queryByRole("link", { name: /Users/i })).not.toBeInTheDocument();
            }
        });
    });

    it("filters out navigation links if permission check evaluates to false", () => {
        const user: User = {
            id: "u-99",
            name: "Custom User",
            email: "custom@hospital.org",
            role: "viewer",
        };

        // Custom mock that denies "doctors.read"
        vi.spyOn(AuthProviderModule, "useAuth").mockReturnValue({
            user,
            role: "viewer",
            isLoading: false,
            isAuthenticated: true,
            login: vi.fn(),
            logout: vi.fn(),
            logoutAll: vi.fn(),
            can: (action) => (action === "doctors.read" ? false : true),
        });

        render(<Sidebar />);

        expect(screen.getByRole("link", { name: /Dashboard/i })).toBeInTheDocument();
        expect(screen.queryByRole("link", { name: /Doctors/i })).not.toBeInTheDocument();
        expect(screen.getByRole("link", { name: /Patients/i })).toBeInTheDocument();
    });
});

