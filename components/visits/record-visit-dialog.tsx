"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import {
    Stethoscope,
    Activity,
    Pill,
    Plus,
    Trash2,
    Loader2,
    AlertCircle,
    Link as LinkIcon,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    createVisitSchema,
    updateVisitSchema,
    type PrescriptionItemFormValues,
} from "@/lib/visit-validation";
import type { ApiResponse, Visit } from "@/types";

interface RecordVisitDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    patientId: string;
    patientName?: string;
    doctorTimezone?: string;
    appointmentId?: string;
    visitToEdit?: Visit | null;
    onSuccess?: (visit: Visit) => void;
    onSwitchToAddendum?: (visitId: string) => void;
}

interface FormFieldErrors {
    chiefComplaint?: string;
    diagnosis?: string;
    notes?: string;
    visitDate?: string;
    followUpDate?: string;
    bpSystolic?: string;
    bpDiastolic?: string;
    heartRate?: string;
    temperatureC?: string;
    weightKg?: string;
    prescriptions?: string;
    [key: string]: string | undefined;
}

export function RecordVisitDialog({
    open,
    onOpenChange,
    patientId,
    patientName,
    doctorTimezone = "Asia/Dhaka",
    appointmentId,
    visitToEdit,
    onSuccess,
    onSwitchToAddendum,
}: RecordVisitDialogProps) {
    const queryClient = useQueryClient();
    const isEdit = !!visitToEdit;

    // Doctor today date helper
    const getDoctorToday = () => {
        try {
            return format(new TZDate(new Date(), doctorTimezone), "yyyy-MM-dd");
        } catch {
            return format(new Date(), "yyyy-MM-dd");
        }
    };

    // Form states
    const [chiefComplaint, setChiefComplaint] = useState(
        () => visitToEdit?.chiefComplaint || ""
    );
    const [diagnosis, setDiagnosis] = useState(
        () => visitToEdit?.diagnosis || ""
    );
    const [notes, setNotes] = useState(() => visitToEdit?.notes || "");
    const [visitDate, setVisitDate] = useState(() => {
        if (visitToEdit) {
            try {
                return format(
                    new TZDate(new Date(visitToEdit.visitDate), doctorTimezone),
                    "yyyy-MM-dd"
                );
            } catch {
                return visitToEdit.visitDate.substring(0, 10);
            }
        }
        return getDoctorToday();
    });
    const [followUpDate, setFollowUpDate] = useState(() => {
        if (visitToEdit?.followUpDate) {
            try {
                return format(
                    new TZDate(new Date(visitToEdit.followUpDate), doctorTimezone),
                    "yyyy-MM-dd"
                );
            } catch {
                return visitToEdit.followUpDate.substring(0, 10);
            }
        }
        return "";
    });

    // Vitals states
    const [bpSystolic, setBpSystolic] = useState(
        () => visitToEdit?.vitals?.bpSystolic?.toString() || ""
    );
    const [bpDiastolic, setBpDiastolic] = useState(
        () => visitToEdit?.vitals?.bpDiastolic?.toString() || ""
    );
    const [heartRate, setHeartRate] = useState(
        () => visitToEdit?.vitals?.heartRate?.toString() || ""
    );
    const [temperatureC, setTemperatureC] = useState(
        () => visitToEdit?.vitals?.temperatureC?.toString() || ""
    );
    const [weightKg, setWeightKg] = useState(
        () => visitToEdit?.vitals?.weightKg?.toString() || ""
    );

    // Prescriptions dynamic array
    const [prescriptions, setPrescriptions] = useState<PrescriptionItemFormValues[]>(
        () =>
            visitToEdit?.prescriptions?.map((p) => ({
                drug: p.drug,
                dose: p.dose,
                frequency: p.frequency,
                durationDays: p.durationDays,
            })) || []
    );

    // Collapsible section states
    const [vitalsOpen, setVitalsOpen] = useState(true);
    const [prescriptionsOpen, setPrescriptionsOpen] = useState(true);

    // Form errors & conflict alerts
    const [fieldErrors, setFieldErrors] = useState<FormFieldErrors>({});
    const [conflictError, setConflictError] = useState<{
        code: "VISIT_EXISTS" | "EDIT_WINDOW_EXPIRED" | string;
        message: string;
    } | null>(null);

    // Populate initial form values when dialog opens or visitToEdit changes
    const [prevOpen, setPrevOpen] = useState(open);
    const [prevVisitToEdit, setPrevVisitToEdit] = useState(visitToEdit);

    if (open !== prevOpen || visitToEdit !== prevVisitToEdit) {
        setPrevOpen(open);
        setPrevVisitToEdit(visitToEdit);
        if (!open) {
            setConflictError(null);
            setFieldErrors({});
        } else if (visitToEdit) {
            setChiefComplaint(visitToEdit.chiefComplaint || "");
            setDiagnosis(visitToEdit.diagnosis || "");
            setNotes(visitToEdit.notes || "");
            try {
                setVisitDate(
                    format(
                        new TZDate(new Date(visitToEdit.visitDate), doctorTimezone),
                        "yyyy-MM-dd"
                    )
                );
            } catch {
                setVisitDate(visitToEdit.visitDate.substring(0, 10));
            }

            if (visitToEdit.followUpDate) {
                try {
                    setFollowUpDate(
                        format(
                            new TZDate(new Date(visitToEdit.followUpDate), doctorTimezone),
                            "yyyy-MM-dd"
                        )
                    );
                } catch {
                    setFollowUpDate(visitToEdit.followUpDate.substring(0, 10));
                }
            } else {
                setFollowUpDate("");
            }

            setBpSystolic(visitToEdit.vitals?.bpSystolic?.toString() || "");
            setBpDiastolic(visitToEdit.vitals?.bpDiastolic?.toString() || "");
            setHeartRate(visitToEdit.vitals?.heartRate?.toString() || "");
            setTemperatureC(visitToEdit.vitals?.temperatureC?.toString() || "");
            setWeightKg(visitToEdit.vitals?.weightKg?.toString() || "");

            setPrescriptions(
                visitToEdit.prescriptions?.map((p) => ({
                    drug: p.drug,
                    dose: p.dose,
                    frequency: p.frequency,
                    durationDays: p.durationDays,
                })) || []
            );
            setFieldErrors({});
            setConflictError(null);
        } else {
            // Reset for new visit
            setChiefComplaint("");
            setDiagnosis("");
            setNotes("");
            setVisitDate(getDoctorToday());
            setFollowUpDate("");
            setBpSystolic("");
            setBpDiastolic("");
            setHeartRate("");
            setTemperatureC("");
            setWeightKg("");
            setPrescriptions([]);
            setFieldErrors({});
            setConflictError(null);
        }
    }

    // Mutation for create or edit
    const mutation = useMutation({
        mutationFn: async (payload: unknown) => {
            if (isEdit && visitToEdit) {
                return api.patch<ApiResponse<{ visit: Visit }>>(
                    `/visits/${visitToEdit._id}`,
                    payload
                );
            }
            return api.post<ApiResponse<{ visit: Visit }>>("/visits", payload);
        },
        onSuccess: (res) => {
            const savedVisit = res?.data?.visit;
            toast.success(
                isEdit ? "Clinical visit updated" : "Clinical visit recorded",
                {
                    description: isEdit
                        ? "Visit record has been updated."
                        : "Clinical visit recorded and appointment auto-completed.",
                }
            );

            // Invalidate queries
            queryClient.invalidateQueries({ queryKey: qk.visits.all() });
            queryClient.invalidateQueries({ queryKey: qk.patients.all() });
            queryClient.invalidateQueries({ queryKey: qk.appointments.all() });
            queryClient.invalidateQueries({ queryKey: qk.dashboard.appointments() });

            onOpenChange(false);
            if (savedVisit && onSuccess) {
                onSuccess(savedVisit);
            }
        },
        onError: (err: unknown) => {
            if (err instanceof ApiError) {
                if (err.code === "VISIT_EXISTS") {
                    setConflictError({
                        code: "VISIT_EXISTS",
                        message: "A clinical visit has already been recorded for this appointment.",
                    });
                    return;
                }
                if (err.code === "EDIT_WINDOW_EXPIRED") {
                    setConflictError({
                        code: "EDIT_WINDOW_EXPIRED",
                        message:
                            "The 24-hour edit window for this clinical visit has expired. You can attach an append-only addendum instead.",
                    });
                    return;
                }

                if (err.fieldErrors && err.fieldErrors.length > 0) {
                    const newErr: FormFieldErrors = {};
                    err.fieldErrors.forEach((fe) => {
                        if (fe.path) newErr[fe.path] = fe.message;
                    });
                    setFieldErrors(newErr);
                } else {
                    toast.error("Error saving visit", { description: err.message });
                }
            } else {
                toast.error("Error saving visit", {
                    description: "An unexpected error occurred. Please try again.",
                });
            }
        },
    });

    // Prescription array helpers
    const handleAddPrescription = () => {
        if (prescriptions.length >= 20) return;
        setPrescriptions([
            ...prescriptions,
            { drug: "", dose: "", frequency: "", durationDays: 1 },
        ]);
    };

    const handleRemovePrescription = (index: number) => {
        setPrescriptions(prescriptions.filter((_, i) => i !== index));
    };

    const handlePrescriptionChange = (
        index: number,
        field: keyof PrescriptionItemFormValues,
        value: string | number
    ) => {
        const next = [...prescriptions];
        next[index] = { ...next[index], [field]: value };
        setPrescriptions(next);
    };

    // Submit handler
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFieldErrors({});
        setConflictError(null);

        // Build raw values
        const vitalsObj: Record<string, number | undefined> = {};
        if (bpSystolic) vitalsObj.bpSystolic = Number(bpSystolic);
        if (bpDiastolic) vitalsObj.bpDiastolic = Number(bpDiastolic);
        if (heartRate) vitalsObj.heartRate = Number(heartRate);
        if (temperatureC) vitalsObj.temperatureC = Number(temperatureC);
        if (weightKg) vitalsObj.weightKg = Number(weightKg);
        const hasVitals = Object.keys(vitalsObj).length > 0;

        // Convert visitDate and followUpDate to UTC ISO in doctor timezone
        let visitDateIso: string | undefined = undefined;
        if (visitDate) {
            try {
                visitDateIso = new TZDate(
                    `${visitDate}T12:00:00`,
                    doctorTimezone
                ).toISOString();
            } catch {
                visitDateIso = new Date(visitDate).toISOString();
            }
        }

        let followUpDateIso: string | null = null;
        if (followUpDate) {
            try {
                followUpDateIso = new TZDate(
                    `${followUpDate}T12:00:00`,
                    doctorTimezone
                ).toISOString();
            } catch {
                followUpDateIso = new Date(followUpDate).toISOString();
            }
        }

        // Validate with Zod
        if (isEdit) {
            const editPayload: Record<string, unknown> = {};
            if (chiefComplaint.trim()) editPayload.chiefComplaint = chiefComplaint.trim();
            if (diagnosis.trim()) editPayload.diagnosis = diagnosis.trim();
            if (notes.trim()) editPayload.notes = notes.trim();

            const hadVitalsBefore =
                !!visitToEdit?.vitals &&
                Object.values(visitToEdit.vitals).some((v) => v !== undefined && v !== null);
            if (hasVitals) {
                editPayload.vitals = vitalsObj;
            } else if (hadVitalsBefore) {
                editPayload.vitals = {};
            }

            const hadPrescriptionsBefore = (visitToEdit?.prescriptions?.length ?? 0) > 0;
            if (prescriptions.length > 0) {
                editPayload.prescriptions = prescriptions;
            } else if (hadPrescriptionsBefore) {
                editPayload.prescriptions = [];
            }

            const hadFollowUpBefore = !!visitToEdit?.followUpDate;
            if (followUpDate && followUpDateIso) {
                editPayload.followUpDate = followUpDateIso;
            } else if (hadFollowUpBefore && !followUpDate) {
                editPayload.followUpDate = null;
            }

            const result = updateVisitSchema.safeParse(editPayload);
            if (!result.success) {
                const errors: FormFieldErrors = {};
                result.error.issues.forEach((issue) => {
                    const key = issue.path.join(".");
                    errors[key] = issue.message;
                });
                setFieldErrors(errors);
                return;
            }
            mutation.mutate(result.data);
        } else {
            const createPayload: Record<string, unknown> = {
                patientId,
                chiefComplaint: chiefComplaint.trim(),
                diagnosis: diagnosis.trim(),
                notes: notes.trim(),
            };
            if (appointmentId) {
                createPayload.appointmentId = appointmentId;
            }
            if (visitDateIso) {
                createPayload.visitDate = visitDateIso;
            }
            if (hasVitals) {
                createPayload.vitals = vitalsObj;
            }
            if (prescriptions.length > 0) {
                createPayload.prescriptions = prescriptions;
            }
            // Follow-up date: ONLY include if populated, otherwise OMIT key completely (never null or undefined on create)
            if (followUpDate && followUpDateIso) {
                createPayload.followUpDate = followUpDateIso;
            }

            const result = createVisitSchema.safeParse(createPayload);
            if (!result.success) {
                const errors: FormFieldErrors = {};
                result.error.issues.forEach((issue) => {
                    const key = issue.path.join(".");
                    errors[key] = issue.message;
                });
                setFieldErrors(errors);
                return;
            }
            mutation.mutate(result.data);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Stethoscope className="h-5 w-5 text-primary" />
                        {isEdit ? "Edit Clinical Visit" : "Record Clinical Visit"}
                    </DialogTitle>
                    <DialogDescription>
                        {patientName ? `Patient: ${patientName}. ` : ""}
                        Clinical notes and treatment records for this consultation.
                    </DialogDescription>
                </DialogHeader>

                {/* Conflict banner */}
                {conflictError && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold">
                                    {conflictError.code === "EDIT_WINDOW_EXPIRED"
                                        ? "Edit Window Expired"
                                        : "Visit Already Exists"}
                                </p>
                                <p className="text-xs mt-0.5">{conflictError.message}</p>
                            </div>
                        </div>
                        {conflictError.code === "EDIT_WINDOW_EXPIRED" && visitToEdit && onSwitchToAddendum && (
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                    onOpenChange(false);
                                    onSwitchToAddendum(visitToEdit._id);
                                }}
                                className="shrink-0"
                            >
                                Switch to Addendum
                            </Button>
                        )}
                        {conflictError.code === "VISIT_EXISTS" && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    onOpenChange(false);
                                    queryClient.invalidateQueries({ queryKey: qk.visits.all() });
                                }}
                                className="shrink-0"
                            >
                                View Timeline
                            </Button>
                        )}
                    </div>
                )}

                {/* Linked appointment indicator */}
                {appointmentId && (
                    <div className="flex items-center gap-2 text-xs bg-muted/60 px-3 py-2 rounded-md text-muted-foreground border">
                        <LinkIcon className="h-3.5 w-3.5 text-primary" />
                        <span>
                            Linked to appointment <code className="font-mono">{appointmentId}</code>. Saving this visit will complete the appointment.
                        </span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Info: Dates */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="visitDate">
                                Visit Date <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="visitDate"
                                type="date"
                                value={visitDate}
                                onChange={(e) => setVisitDate(e.target.value)}
                                className={fieldErrors.visitDate ? "border-destructive" : ""}
                            />
                            <p className="text-[11px] text-muted-foreground">
                                Doctor Timezone: {doctorTimezone}
                            </p>
                            {fieldErrors.visitDate && (
                                <p className="text-xs text-destructive">{fieldErrors.visitDate}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="followUpDate">Follow-up Date (Optional)</Label>
                            <Input
                                id="followUpDate"
                                type="date"
                                min={visitDate || getDoctorToday()}
                                value={followUpDate}
                                onChange={(e) => setFollowUpDate(e.target.value)}
                                className={fieldErrors.followUpDate ? "border-destructive" : ""}
                            />
                            {fieldErrors.followUpDate && (
                                <p className="text-xs text-destructive">{fieldErrors.followUpDate}</p>
                            )}
                        </div>
                    </div>

                    {/* Chief Complaint & Diagnosis */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="chiefComplaint">
                                    Chief Complaint <span className="text-destructive">*</span>
                                </Label>
                                <span
                                    className={`text-[11px] ${
                                        chiefComplaint.length > 300
                                            ? "text-destructive font-medium"
                                            : "text-muted-foreground"
                                    }`}
                                >
                                    {chiefComplaint.length}/300
                                </span>
                            </div>
                            <Input
                                id="chiefComplaint"
                                placeholder="e.g. Persistent dry cough and mild fever"
                                maxLength={300}
                                value={chiefComplaint}
                                onChange={(e) => setChiefComplaint(e.target.value)}
                                className={fieldErrors.chiefComplaint ? "border-destructive" : ""}
                            />
                            {fieldErrors.chiefComplaint && (
                                <p className="text-xs text-destructive">{fieldErrors.chiefComplaint}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="diagnosis">
                                    Diagnosis <span className="text-destructive">*</span>
                                </Label>
                                <span
                                    className={`text-[11px] ${
                                        diagnosis.length > 300
                                            ? "text-destructive font-medium"
                                            : "text-muted-foreground"
                                    }`}
                                >
                                    {diagnosis.length}/300
                                </span>
                            </div>
                            <Input
                                id="diagnosis"
                                placeholder="e.g. Acute upper respiratory infection"
                                maxLength={300}
                                value={diagnosis}
                                onChange={(e) => setDiagnosis(e.target.value)}
                                className={fieldErrors.diagnosis ? "border-destructive" : ""}
                            />
                            {fieldErrors.diagnosis && (
                                <p className="text-xs text-destructive">{fieldErrors.diagnosis}</p>
                            )}
                        </div>
                    </div>

                    {/* Clinical Notes with counter */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="notes">
                                Clinical Notes <span className="text-destructive">*</span>
                            </Label>
                            <span
                                className={`text-[11px] ${
                                    notes.length > 5000
                                        ? "text-destructive font-medium"
                                        : "text-muted-foreground"
                                }`}
                            >
                                {notes.length}/5000
                            </span>
                        </div>
                        <Textarea
                            id="notes"
                            placeholder="Detailed clinical evaluation, physical exam findings, examination plan, and discussion..."
                            rows={4}
                            maxLength={5000}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className={fieldErrors.notes ? "border-destructive" : ""}
                        />
                        {fieldErrors.notes && (
                            <p className="text-xs text-destructive">{fieldErrors.notes}</p>
                        )}
                    </div>

                    {/* Vitals & Prescriptions Collapsible Sections */}
                    <div className="border rounded-lg divide-y">
                        {/* Vitals Section */}
                        <div className="p-3">
                            <button
                                type="button"
                                onClick={() => setVitalsOpen(!vitalsOpen)}
                                className="flex items-center justify-between w-full text-left text-sm font-semibold hover:text-primary transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-emerald-600" />
                                    <span>Vitals (Optional)</span>
                                </div>
                                {vitalsOpen ? (
                                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                )}
                            </button>

                            {vitalsOpen && (
                                <div className="pt-3 pb-1 space-y-3">
                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                        <div className="space-y-1">
                                            <Label htmlFor="bpSystolic" className="text-xs">
                                                BP Systolic
                                            </Label>
                                            <Input
                                                id="bpSystolic"
                                                type="number"
                                                placeholder="50-250"
                                                value={bpSystolic}
                                                onChange={(e) => setBpSystolic(e.target.value)}
                                                className="h-8 text-xs"
                                            />
                                            <span className="text-[10px] text-muted-foreground">mmHg</span>
                                            {fieldErrors["vitals.bpSystolic"] && (
                                                <p className="text-[10px] text-destructive">{fieldErrors["vitals.bpSystolic"]}</p>
                                            )}
                                        </div>

                                        <div className="space-y-1">
                                            <Label htmlFor="bpDiastolic" className="text-xs">
                                                BP Diastolic
                                            </Label>
                                            <Input
                                                id="bpDiastolic"
                                                type="number"
                                                placeholder="30-150"
                                                value={bpDiastolic}
                                                onChange={(e) => setBpDiastolic(e.target.value)}
                                                className="h-8 text-xs"
                                            />
                                            <span className="text-[10px] text-muted-foreground">mmHg</span>
                                            {fieldErrors["vitals.bpDiastolic"] && (
                                                <p className="text-[10px] text-destructive">{fieldErrors["vitals.bpDiastolic"]}</p>
                                            )}
                                        </div>

                                        <div className="space-y-1">
                                            <Label htmlFor="heartRate" className="text-xs">
                                                Heart Rate
                                            </Label>
                                            <Input
                                                id="heartRate"
                                                type="number"
                                                placeholder="30-250"
                                                value={heartRate}
                                                onChange={(e) => setHeartRate(e.target.value)}
                                                className="h-8 text-xs"
                                            />
                                            <span className="text-[10px] text-muted-foreground">bpm</span>
                                            {fieldErrors["vitals.heartRate"] && (
                                                <p className="text-[10px] text-destructive">{fieldErrors["vitals.heartRate"]}</p>
                                            )}
                                        </div>

                                        <div className="space-y-1">
                                            <Label htmlFor="temperatureC" className="text-xs">
                                                Temperature
                                            </Label>
                                            <Input
                                                id="temperatureC"
                                                type="number"
                                                step="0.1"
                                                placeholder="30-45"
                                                value={temperatureC}
                                                onChange={(e) => setTemperatureC(e.target.value)}
                                                className="h-8 text-xs"
                                            />
                                            <span className="text-[10px] text-muted-foreground">°C</span>
                                            {fieldErrors["vitals.temperatureC"] && (
                                                <p className="text-[10px] text-destructive">{fieldErrors["vitals.temperatureC"]}</p>
                                            )}
                                        </div>

                                        <div className="space-y-1">
                                            <Label htmlFor="weightKg" className="text-xs">
                                                Weight
                                            </Label>
                                            <Input
                                                id="weightKg"
                                                type="number"
                                                step="0.5"
                                                placeholder="1-300"
                                                value={weightKg}
                                                onChange={(e) => setWeightKg(e.target.value)}
                                                className="h-8 text-xs"
                                            />
                                            <span className="text-[10px] text-muted-foreground">kg</span>
                                            {fieldErrors["vitals.weightKg"] && (
                                                <p className="text-[10px] text-destructive">{fieldErrors["vitals.weightKg"]}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Prescriptions Section */}
                        <div className="p-3">
                            <button
                                type="button"
                                onClick={() => setPrescriptionsOpen(!prescriptionsOpen)}
                                className="flex items-center justify-between w-full text-left text-sm font-semibold hover:text-primary transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <Pill className="h-4 w-4 text-sky-600" />
                                    <span>Prescriptions ({prescriptions.length}/20)</span>
                                </div>
                                {prescriptionsOpen ? (
                                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                )}
                            </button>

                            {prescriptionsOpen && (
                                <div className="pt-3 pb-1 space-y-3">
                                    {prescriptions.length === 0 ? (
                                        <div className="text-center py-4 bg-muted/30 rounded border border-dashed text-xs text-muted-foreground">
                                            No medications added. Click below to add prescriptions.
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {prescriptions.map((p, idx) => (
                                                <div
                                                    key={idx}
                                                    className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-card p-2 rounded border"
                                                >
                                                    <div className="sm:col-span-4">
                                                        <Input
                                                            placeholder="Drug (e.g. Paracetamol)"
                                                            value={p.drug}
                                                            maxLength={100}
                                                            onChange={(e) =>
                                                                handlePrescriptionChange(idx, "drug", e.target.value)
                                                            }
                                                            className="h-8 text-xs"
                                                        />
                                                    </div>
                                                    <div className="sm:col-span-3">
                                                        <Input
                                                            placeholder="Dose (e.g. 500mg)"
                                                            value={p.dose}
                                                            maxLength={50}
                                                            onChange={(e) =>
                                                                handlePrescriptionChange(idx, "dose", e.target.value)
                                                            }
                                                            className="h-8 text-xs"
                                                        />
                                                    </div>
                                                    <div className="sm:col-span-3">
                                                        <Input
                                                            placeholder="Freq (e.g. 1-0-1 after food)"
                                                            value={p.frequency}
                                                            maxLength={50}
                                                            onChange={(e) =>
                                                                handlePrescriptionChange(idx, "frequency", e.target.value)
                                                            }
                                                            className="h-8 text-xs"
                                                        />
                                                    </div>
                                                    <div className="sm:col-span-1">
                                                        <Input
                                                            type="number"
                                                            placeholder="Days"
                                                            min={1}
                                                            max={365}
                                                            value={p.durationDays}
                                                            onChange={(e) =>
                                                                handlePrescriptionChange(
                                                                    idx,
                                                                    "durationDays",
                                                                    e.target.value ? parseInt(e.target.value, 10) : 1
                                                                )
                                                            }
                                                            className="h-8 text-xs px-1 text-center"
                                                            title="Duration in days"
                                                        />
                                                    </div>
                                                    <div className="sm:col-span-1 flex justify-end">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleRemovePrescription(idx)}
                                                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                                            aria-label="Remove prescription"
                                                            title="Remove prescription"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleAddPrescription}
                                        disabled={prescriptions.length >= 20}
                                        className="gap-1 text-xs"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Add Medication
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={mutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={mutation.isPending}>
                            {mutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : isEdit ? (
                                "Update Visit"
                            ) : (
                                "Record Clinical Visit"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
