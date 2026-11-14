export type Role = "admin" | "staff" | "doctor" | "viewer";

export interface User {
    id: string;
    name: string;
    email: string;
    role: Role;
    doctorId?: string;
}

export interface AppUser {
    id: string;
    name: string;
    email: string;
    role: Role;
    doctorId?: string;
    isActive: boolean;
    tokenVersion: number;
    lastLoginAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface WorkingHours {
    dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    start: string;     // HH:mm
    end: string;       // HH:mm
}

export interface Doctor {
    _id: string;
    name: string;
    specialization: string;
    hospital: string;
    phone: string;
    email: string;
    timezone?: string;
    slotMinutes?: number;
    workingHours?: WorkingHours[];
    isDeleted?: boolean;
    deletedAt?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface Patient {
    _id: string;
    name: string;
    age: number;
    gender: "male" | "female" | "other";
    phone: string;
    email?: string;
    condition: string;
    doctorId: string | Doctor;
    isDeleted?: boolean;
    deletedAt?: string | null;
    createdAt: string;
    updatedAt: string;
}

export type AppointmentStatus = "scheduled" | "completed" | "cancelled" | "no_show";

export interface Appointment {
    _id: string;
    doctorId: string | Doctor;
    patientId: string | Patient;
    startsAt: string;
    endsAt: string;
    status: AppointmentStatus;
    reason?: string;
    cancelReason?: string;
    visitId?: string;
    createdBy?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface Prescription {
    drug: string;
    dose: string;
    frequency: string;
    durationDays: number;
}

export interface Vitals {
    bpSystolic?: number;
    bpDiastolic?: number;
    heartRate?: number;
    temperatureC?: number;
    weightKg?: number;
}

export interface Addendum {
    text: string;
    by: string;
    at: string;
}

export interface Visit {
    _id: string;
    patientId: string | Patient;
    doctorId: string | Doctor;
    appointmentId?: string;
    visitDate: string;
    chiefComplaint: string;
    diagnosis: string;
    notes: string;
    vitals?: Vitals;
    prescriptions?: Prescription[];
    addenda?: Addendum[];
    createdBy?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface AuditLogChange {
    field: string;
    from?: unknown;
    to?: unknown;
}

export interface AuditLog {
    _id: string;
    actorId?: string;
    actorRole?: Role;
    actorEmail?: string;
    action: string;
    entityType?: string;
    entityId?: string;
    outcome: "success" | "failure";
    changes?: AuditLogChange[];
    metadata?: {
        ip?: string;
        userAgent?: string;
        requestId?: string;
    };
    createdAt: string;
}

export interface Pagination {
    currentPage: number;
    limit: number;
    totalDoctors?: number;
    totalPatients?: number;
    totalUsers?: number;
    totalAppointments?: number;
    totalVisits?: number;
    totalAuditLogs?: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

export interface Paginated<T> {
    items: T[];
    pagination: Pagination;
}

export interface DoctorsResponse {
    doctors: Doctor[];
    pagination: Pagination;
}

export interface PatientsResponse {
    patients: Patient[];
    pagination: Pagination;
}

export interface UsersResponse {
    users: AppUser[];
    pagination: Pagination;
}

export interface AppointmentsResponse {
    appointments: Appointment[];
    pagination: Pagination;
}

export interface AvailabilitySlot {
    startsAt: string;
    endsAt: string;
    available: boolean;
}

export interface AvailabilityDay {
    date: string;
    slots: AvailabilitySlot[];
}

export interface DoctorAvailabilityResponse {
    doctorId: string;
    timezone: string;
    slotMinutes: number;
    days: AvailabilityDay[];
}

export interface VisitsResponse {
    visits: Visit[];
    pagination: Pagination;
}

export interface AuditLogsResponse {
    logs: AuditLog[];
    pagination: Pagination;
}

export interface DashboardStats {
    summary: {
        totalDoctors: number;
        totalPatients: number;
        averagePatientsPerDoctor: number;
    };
    patientsPerDoctor: {
        average: number;
        topDoctors: Array<{
            doctorId: string;
            name: string;
            specialization: string;
            hospital: string;
            patientCount: number;
        }>;
        allDoctors: Array<{
            doctorId: string;
            name: string;
            specialization: string;
            hospital: string;
            patientCount: number;
        }>;
    };
    dateWiseStats: {
        range: string;
        startDate: string;
        endDate: string;
        timeline: Array<{
            date: string;
            doctors: number;
            patients: number;
        }>;
    };
    insights: {
        specializationStats: Array<{
            specialization: string;
            doctorCount: number;
        }>;
        topConditions: Array<{
            condition: string;
            patientCount: number;
        }>;
    };
}

export interface AppointmentsDashboardStats {
    today: {
        total: number;
        scheduled: number;
        completed: number;
        cancelled: number;
        noShow: number;
    };
    next7Days: Array<{
        date: string;
        scheduledCount: number;
    }>;
    noShowRate: {
        ratePercentage: number;
        noShowCount: number;
        totalAppointments: number;
        range: string;
    };
    topBusiestDoctors?: Array<{
        doctorId: string;
        name: string;
        specialization: string;
        hospital: string;
        scheduledCount: number;
    }>;
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    message?: string;
    code?: string;
    data?: T;
    errors?: Array<{
        path?: string | string[];
        message: string;
    }>;
}
