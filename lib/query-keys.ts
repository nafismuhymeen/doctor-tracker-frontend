export const qk = {
    auth: {
        me: () => ["auth", "me"] as const,
    },
    users: {
        all: () => ["users"] as const,
        list: (params?: string) => ["users", "list", params ?? ""] as const,
        detail: (id: string) => ["users", "detail", id] as const,
    },
    doctors: {
        all: () => ["doctors"] as const,
        list: (params?: string) => ["doctors", "list", params ?? ""] as const,
        detail: (id: string) => ["doctors", "detail", id] as const,
        patients: (id: string, params?: string) =>
            ["doctors", "patients", id, params ?? ""] as const,
        availability: (id: string, date: string, days?: number) =>
            ["doctors", "availability", id, date, days ?? 1] as const,
    },
    patients: {
        all: () => ["patients"] as const,
        list: (params?: string) => ["patients", "list", params ?? ""] as const,
        detail: (id: string) => ["patients", "detail", id] as const,
        visits: (patientId: string, params?: string) =>
            ["patients", "visits", patientId, params ?? ""] as const,
    },
    appointments: {
        all: () => ["appointments"] as const,
        list: (params?: string) =>
            ["appointments", "list", params ?? ""] as const,
        detail: (id: string) => ["appointments", "detail", id] as const,
    },
    visits: {
        all: () => ["visits"] as const,
        patient: (patientId: string, params?: string) =>
            ["patients", "visits", patientId, params ?? ""] as const,
        detail: (id: string) => ["visits", "detail", id] as const,
    },
    dashboard: {
        stats: (range?: string) => ["dashboardStats", range ?? "30d"] as const,
        appointments: (range?: string) =>
            ["dashboardAppointments", range ?? "30d"] as const,
    },
    audit: {
        all: () => ["audit"] as const,
        list: (params?: string) => ["audit", "list", params ?? ""] as const,
        detail: (id: string) => ["audit", "detail", id] as const,
    },
};

