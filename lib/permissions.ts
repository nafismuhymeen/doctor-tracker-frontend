import type { Role } from "@/types";

export type Action =
    | "auth.change_password"
    | "auth.sign_out"
    | "users.manage"
    | "doctors.list"
    | "doctors.read"
    | "doctors.view"
    | "doctors.availability"
    | "doctors.create"
    | "doctors.delete"
    | "doctors.edit_profile"
    | "doctors.edit_schedule"
    | "patients.list"
    | "patients.read"
    | "patients.view"
    | "patients.create"
    | "patients.edit"
    | "patients.update"
    | "patients.delete"
    | "dashboard.stats"
    | "dashboard.appointments"
    | "appointments.list"
    | "appointments.view"
    | "appointments.book"
    | "appointments.status"
    | "appointments.reschedule"
    | "visits.read"
    | "visits.create"
    | "visits.edit"
    | "visits.addendum"
    | "audit.view";

export type AppAction = Action;

export interface PermissionContext {
    doctorId?: string;
    targetDoctorId?: string;
    authorDoctorId?: string;
}

/**
 * Centrally evaluates whether a user role is permitted to perform an action.
 * Mirrors Appendix A of FRONTEND_ROADMAP.md and backend RBAC rules.
 */
export function can(
    role: Role | undefined | null,
    action: Action,
    ctx?: PermissionContext
): boolean {
    if (!role) return false;

    switch (action) {
        case "auth.change_password":
        case "auth.sign_out":
            return true;

        case "users.manage":
        case "audit.view":
        case "doctors.create":
        case "doctors.delete":
        case "doctors.edit_profile":
            return role === "admin";

        case "doctors.list":
        case "doctors.read":
        case "doctors.view":
        case "doctors.availability":
            return true;

        case "doctors.edit_schedule":
            if (role === "admin") return true;
            if (role === "doctor") {
                if (ctx?.targetDoctorId && ctx?.doctorId) {
                    return ctx.targetDoctorId === ctx.doctorId;
                }
                return true;
            }
            return false;

        case "patients.list":
        case "patients.read":
        case "patients.view":
            return true;

        case "patients.create":
        case "patients.edit":
        case "patients.update":
            if (role === "admin" || role === "staff") return true;
            if (role === "doctor") {
                if (ctx?.targetDoctorId && ctx?.doctorId) {
                    return ctx.targetDoctorId === ctx.doctorId;
                }
                return true;
            }
            return false;

        case "patients.delete":
            return role === "admin" || role === "staff";

        case "dashboard.stats":
            return role === "admin" || role === "staff" || role === "viewer";

        case "dashboard.appointments":
        case "appointments.list":
        case "appointments.view":
            return true;

        case "appointments.book":
        case "appointments.status":
        case "appointments.reschedule":
            if (role === "admin" || role === "staff") return true;
            if (role === "doctor") {
                if (ctx?.targetDoctorId && ctx?.doctorId) {
                    return ctx.targetDoctorId === ctx.doctorId;
                }
                return true;
            }
            return false;

        case "visits.read":
            if (role === "admin") return true;
            if (role === "doctor") {
                if (ctx?.targetDoctorId && ctx?.doctorId) {
                    return ctx.targetDoctorId === ctx.doctorId;
                }
                return true;
            }
            return false;

        case "visits.create":
        case "visits.edit":
        case "visits.addendum":
            if (role === "doctor") {
                if (ctx?.targetDoctorId && ctx?.doctorId) {
                    return ctx.targetDoctorId === ctx.doctorId;
                }
                return true;
            }
            return false;

        default:
            return false;
    }
}
