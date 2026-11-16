import * as z from "zod";

const optionalNumberField = (min: number, max: number, minMsg: string, maxMsg: string) =>
    z.preprocess(
        (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
        z.number({ message: "Must be a valid number" }).min(min, minMsg).max(max, maxMsg).optional()
    );

export const vitalsSchema = z.object({
    bpSystolic: optionalNumberField(50, 250, "Systolic BP must be at least 50", "Systolic BP cannot exceed 250"),
    bpDiastolic: optionalNumberField(30, 150, "Diastolic BP must be at least 30", "Diastolic BP cannot exceed 150"),
    heartRate: optionalNumberField(30, 250, "Heart rate must be at least 30", "Heart rate cannot exceed 250"),
    temperatureC: optionalNumberField(30, 45, "Temperature must be at least 30°C", "Temperature cannot exceed 45°C"),
    weightKg: optionalNumberField(1, 300, "Weight must be at least 1kg", "Weight cannot exceed 300kg"),
});

export const prescriptionItemSchema = z.object({
    drug: z
        .string()
        .trim()
        .min(1, "Drug name is required")
        .max(100, "Drug name cannot exceed 100 characters"),
    dose: z
        .string()
        .trim()
        .min(1, "Dose is required")
        .max(50, "Dose cannot exceed 50 characters"),
    frequency: z
        .string()
        .trim()
        .min(1, "Frequency is required")
        .max(50, "Frequency cannot exceed 50 characters"),
    durationDays: z.preprocess(
        (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
        z
            .number({ message: "Duration is required" })
            .int("Duration must be a whole number")
            .min(1, "Duration must be at least 1 day")
            .max(365, "Duration cannot exceed 365 days")
    ),
});

export const createVisitSchema = z.object({
    patientId: z.string().trim().min(1, "Patient is required"),
    appointmentId: z.string().trim().optional(),
    visitDate: z.string().optional(),
    chiefComplaint: z
        .string()
        .trim()
        .min(1, "Chief complaint is required")
        .max(300, "Chief complaint cannot exceed 300 characters"),
    diagnosis: z
        .string()
        .trim()
        .min(1, "Diagnosis is required")
        .max(300, "Diagnosis cannot exceed 300 characters"),
    notes: z
        .string()
        .trim()
        .min(1, "Notes are required")
        .max(5000, "Notes cannot exceed 5000 characters"),
    vitals: vitalsSchema.optional(),
    prescriptions: z
        .array(prescriptionItemSchema)
        .max(20, "Cannot prescribe more than 20 medications per visit")
        .optional(),
    followUpDate: z.string().nullable().optional(),
});

export const updateVisitSchema = z
    .object({
        chiefComplaint: z
            .string()
            .trim()
            .min(1, "Chief complaint is required")
            .max(300, "Chief complaint cannot exceed 300 characters")
            .optional(),
        diagnosis: z
            .string()
            .trim()
            .min(1, "Diagnosis is required")
            .max(300, "Diagnosis cannot exceed 300 characters")
            .optional(),
        notes: z
            .string()
            .trim()
            .min(1, "Notes are required")
            .max(5000, "Notes cannot exceed 5000 characters")
            .optional(),
        vitals: vitalsSchema.optional(),
        prescriptions: z
            .array(prescriptionItemSchema)
            .max(20, "Cannot prescribe more than 20 medications per visit")
            .optional(),
        followUpDate: z.string().nullable().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided for update",
    });

export const createAddendumSchema = z.object({
    text: z
        .string()
        .trim()
        .min(1, "Addendum text is required")
        .max(2000, "Addendum cannot exceed 2000 characters"),
});

export type VitalsFormValues = z.infer<typeof vitalsSchema>;
export type PrescriptionItemFormValues = z.infer<typeof prescriptionItemSchema>;
export type CreateVisitFormValues = z.infer<typeof createVisitSchema>;
export type UpdateVisitFormValues = z.infer<typeof updateVisitSchema>;
export type CreateAddendumFormValues = z.infer<typeof createAddendumSchema>;
