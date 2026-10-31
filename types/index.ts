export interface Admin {
    id: string;
    name: string;
    email: string;
}

export interface Doctor {
    _id: string;
    name: string;
    specialization: string;
    hospital: string;
    phone: string;
    email: string;
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
    createdAt: string;
    updatedAt: string;
}

export interface Pagination {
    currentPage: number;
    limit: number;
    totalDoctors?: number;
    totalPatients?: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

export interface DoctorsResponse {
    doctors: Doctor[];
    pagination: Pagination;
}

export interface PatientsResponse {
    patients: Patient[];
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

export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data?: T;
}

