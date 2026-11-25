import { describe, it, expect } from "vitest";
import { can } from "@/lib/permissions";
import type { Role } from "@/types";

describe("Permissions (can) Matrix", () => {
    describe("Anonymous / null role", () => {
        it("denies all actions when role is undefined or null", () => {
            expect(can(undefined, "doctors.list")).toBe(false);
            expect(can(null, "patients.list")).toBe(false);
            expect(can(undefined, "auth.sign_out")).toBe(false);
        });
    });

    describe("Admin role", () => {
        const role: Role = "admin";

        it("permits administrative actions", () => {
            expect(can(role, "users.manage")).toBe(true);
            expect(can(role, "audit.view")).toBe(true);
            expect(can(role, "doctors.create")).toBe(true);
            expect(can(role, "doctors.delete")).toBe(true);
            expect(can(role, "doctors.edit_profile")).toBe(true);
            expect(can(role, "doctors.edit_schedule")).toBe(true);
        });

        it("permits patient and appointment operations", () => {
            expect(can(role, "patients.create")).toBe(true);
            expect(can(role, "patients.edit")).toBe(true);
            expect(can(role, "patients.delete")).toBe(true);
            expect(can(role, "appointments.book")).toBe(true);
            expect(can(role, "appointments.status")).toBe(true);
            expect(can(role, "appointments.reschedule")).toBe(true);
            expect(can(role, "dashboard.stats")).toBe(true);
        });

        it("permits viewing clinical visits but denies doctor-only visit mutations", () => {
            expect(can(role, "visits.read")).toBe(true);
            expect(can(role, "visits.create")).toBe(false);
            expect(can(role, "visits.edit")).toBe(false);
            expect(can(role, "visits.addendum")).toBe(false);
        });
    });

    describe("Staff role", () => {
        const role: Role = "staff";

        it("denies user management and audit log access", () => {
            expect(can(role, "users.manage")).toBe(false);
            expect(can(role, "audit.view")).toBe(false);
        });

        it("denies doctor creation and deletion", () => {
            expect(can(role, "doctors.create")).toBe(false);
            expect(can(role, "doctors.delete")).toBe(false);
            expect(can(role, "doctors.edit_profile")).toBe(false);
            expect(can(role, "doctors.edit_schedule")).toBe(false);
        });

        it("permits patient lifecycle management", () => {
            expect(can(role, "patients.list")).toBe(true);
            expect(can(role, "patients.create")).toBe(true);
            expect(can(role, "patients.edit")).toBe(true);
            expect(can(role, "patients.delete")).toBe(true);
        });

        it("permits booking and rescheduling appointments", () => {
            expect(can(role, "appointments.book")).toBe(true);
            expect(can(role, "appointments.status")).toBe(true);
            expect(can(role, "appointments.reschedule")).toBe(true);
            expect(can(role, "dashboard.stats")).toBe(true);
        });

        it("denies clinical visit access", () => {
            expect(can(role, "visits.read")).toBe(false);
            expect(can(role, "visits.create")).toBe(false);
        });
    });

    describe("Doctor role", () => {
        const role: Role = "doctor";

        it("denies system-level management and stats", () => {
            expect(can(role, "users.manage")).toBe(false);
            expect(can(role, "audit.view")).toBe(false);
            expect(can(role, "doctors.create")).toBe(false);
            expect(can(role, "doctors.delete")).toBe(false);
            expect(can(role, "dashboard.stats")).toBe(false);
            expect(can(role, "patients.delete")).toBe(false);
        });

        it("permits read access to doctors and patients", () => {
            expect(can(role, "doctors.list")).toBe(true);
            expect(can(role, "doctors.view")).toBe(true);
            expect(can(role, "patients.list")).toBe(true);
            expect(can(role, "patients.view")).toBe(true);
        });

        it("respects own-scope checks for schedule and visits", () => {
            // Unscoped check
            expect(can(role, "doctors.edit_schedule")).toBe(true);
            expect(can(role, "visits.create")).toBe(true);

            // Scoped check: matching doctor ID
            expect(
                can(role, "doctors.edit_schedule", {
                    doctorId: "doc-1",
                    targetDoctorId: "doc-1",
                })
            ).toBe(true);

            // Scoped check: mismatched doctor ID
            expect(
                can(role, "doctors.edit_schedule", {
                    doctorId: "doc-1",
                    targetDoctorId: "doc-2",
                })
            ).toBe(false);

            expect(
                can(role, "visits.read", {
                    doctorId: "doc-1",
                    targetDoctorId: "doc-2",
                })
            ).toBe(false);
        });
    });

    describe("Viewer role", () => {
        const role: Role = "viewer";

        it("permits read-only viewing of dashboard stats and catalogs", () => {
            expect(can(role, "dashboard.stats")).toBe(true);
            expect(can(role, "doctors.list")).toBe(true);
            expect(can(role, "patients.list")).toBe(true);
            expect(can(role, "appointments.list")).toBe(true);
        });

        it("denies all mutations across all resources", () => {
            expect(can(role, "users.manage")).toBe(false);
            expect(can(role, "doctors.create")).toBe(false);
            expect(can(role, "doctors.delete")).toBe(false);
            expect(can(role, "patients.create")).toBe(false);
            expect(can(role, "patients.edit")).toBe(false);
            expect(can(role, "patients.delete")).toBe(false);
            expect(can(role, "appointments.book")).toBe(false);
            expect(can(role, "visits.create")).toBe(false);
            expect(can(role, "visits.read")).toBe(false);
        });
    });
});

