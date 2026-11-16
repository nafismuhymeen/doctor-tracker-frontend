export const AUDIT_ACTIONS = [
    { value: "auth.login.success", label: "Auth: Login Success" },
    { value: "auth.login.failure", label: "Auth: Login Failure" },
    { value: "auth.logout", label: "Auth: Logout" },
    { value: "auth.logout_all", label: "Auth: Logout All" },
    { value: "auth.password.change", label: "Auth: Password Change" },
    { value: "auth.refresh.reuse_detected", label: "Auth: Refresh Reuse Detected" },
    { value: "user.create", label: "User: Create" },
    { value: "user.update", label: "User: Update" },
    { value: "user.deactivate", label: "User: Deactivate" },
    { value: "user.reset_password", label: "User: Reset Password" },
    { value: "doctor.create", label: "Doctor: Create" },
    { value: "doctor.update", label: "Doctor: Update" },
    { value: "doctor.delete", label: "Doctor: Delete" },
    { value: "patient.create", label: "Patient: Create" },
    { value: "patient.update", label: "Patient: Update" },
    { value: "patient.delete", label: "Patient: Delete" },
    { value: "appointment.create", label: "Appointment: Create" },
    { value: "appointment.status_change", label: "Appointment: Status Change" },
    { value: "appointment.reschedule", label: "Appointment: Reschedule" },
    { value: "visit.create", label: "Visit: Create" },
    { value: "visit.read", label: "Visit: Read" },
    { value: "visit.list", label: "Visit: List" },
    { value: "visit.update", label: "Visit: Update" },
    { value: "visit.addendum", label: "Visit: Addendum" },
    { value: "access.denied", label: "Access: Denied" },
] as const;

export const AUDIT_ENTITY_TYPES = [
    "User",
    "Doctor",
    "Patient",
    "Appointment",
    "Visit",
    "Auth",
    "Access",
] as const;

export function getViewerTimeZone(): string {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
        return "UTC";
    }
}

export function formatViewerDateTime(dateStr: string): string {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    try {
        return new Intl.DateTimeFormat(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hourCycle: "h23",
            timeZoneName: "short",
        }).format(d);
    } catch {
        return d.toLocaleString();
    }
}

/**
 * Interprets a "yyyy-MM-dd" date string as a local midnight or end-of-day in the viewer's
 * local timezone and returns its UTC ISO 8601 string representation.
 */
export function localDateToUtcIso(dateStr: string, boundary: "start" | "end"): string | undefined {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return undefined;
    }

    const [year, month, day] = dateStr.split("-").map(Number);
    if (!year || !month || !day) return undefined;

    let date: Date;
    if (boundary === "start") {
        date = new Date(year, month - 1, day, 0, 0, 0, 0);
    } else {
        date = new Date(year, month - 1, day, 23, 59, 59, 999);
    }

    if (isNaN(date.getTime())) return undefined;
    return date.toISOString();
}

