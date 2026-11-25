"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Trash2, Calendar, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { ApiResponse, Doctor } from "@/types";

interface DeleteDoctorDialogProps {
    doctor: Doctor | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDeleted?: () => void;
    initialPatientCount?: number;
}

export function DeleteDoctorDialog({
    doctor,
    open,
    onOpenChange,
    onDeleted,
    initialPatientCount,
}: DeleteDoctorDialogProps) {
    const queryClient = useQueryClient();
    const [reassignDoctorId, setReassignDoctorId] = useState<string>("");
    const [appointmentConflict, setAppointmentConflict] = useState<{
        hasConflict: boolean;
        message: string;
    } | null>(null);

    // Fetch doctor's assigned patients count if not supplied
    const {
        data: patientsData,
        isLoading: isLoadingPatients,
        isError: isPatientsError,
        refetch: refetchPatients,
    } = useQuery({
        queryKey: qk.doctors.patients(doctor?._id || "", "limit=1"),
        queryFn: () =>
            api.get<ApiResponse<{ pagination?: { totalPatients?: number } }>>(
                `/doctors/${doctor?._id}/patients?limit=1`
            ),
        enabled: open && !!doctor && initialPatientCount === undefined,
    });

    const isPatientCountKnown =
        initialPatientCount !== undefined ||
        (!isLoadingPatients && !isPatientsError && patientsData !== undefined);

    const patientCount =
        initialPatientCount ??
        patientsData?.data?.pagination?.totalPatients ??
        0;

    // Fetch other active doctors to reassign patients to
    const { data: otherDoctorsData, isLoading: isLoadingDoctors } = useQuery({
        queryKey: qk.doctors.list("limit=100"),
        queryFn: () =>
            api.get<ApiResponse<{ doctors: Doctor[] }>>("/doctors?limit=100"),
        enabled: open && !!doctor && patientCount > 0,
    });

    const availableReassignDoctors = (
        otherDoctorsData?.data?.doctors || []
    ).filter((d) => d._id !== doctor?._id);

    const deleteMutation = useMutation({
        mutationFn: async () => {
            if (!doctor) throw new Error("No doctor selected");
            const url =
                patientCount > 0 && reassignDoctorId
                    ? `/doctors/${doctor._id}?reassignToDoctorId=${reassignDoctorId}`
                    : `/doctors/${doctor._id}`;
            return api.delete(url);
        },
        onSuccess: () => {
            toast.success("Doctor deleted successfully", {
                description:
                    patientCount > 0
                        ? `Patients reassigned and Dr. ${doctor?.name} soft-deleted.`
                        : `Dr. ${doctor?.name} removed.`,
            });
            queryClient.invalidateQueries({ queryKey: qk.doctors.all() });
            queryClient.invalidateQueries({ queryKey: qk.patients.all() });
            queryClient.invalidateQueries({ queryKey: qk.dashboard.stats() });
            onOpenChange(false);
            onDeleted?.();
        },
        onError: (err: unknown) => {
            if (err instanceof ApiError) {
                if (err.code === "DOCTOR_HAS_APPOINTMENTS") {
                    setAppointmentConflict({
                        hasConflict: true,
                        message: err.message,
                    });
                    return;
                }
                toast.error("Deletion Failed", { description: err.message });
            } else {
                toast.error("Deletion Failed", {
                    description: "An unexpected error occurred while deleting the doctor.",
                });
            }
        },
    });

    if (!doctor) return null;

    const handleClose = (openNext: boolean) => {
        if (!deleteMutation.isPending) {
            if (!openNext) {
                setAppointmentConflict(null);
                setReassignDoctorId("");
            }
            onOpenChange(openNext);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={handleClose}>
            <AlertDialogContent className="sm:max-w-[500px]">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                        <Trash2 className="h-5 w-5" />
                        Delete Doctor Record
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to delete Dr.{" "}
                        <span className="font-semibold text-foreground">
                            {doctor.name}
                        </span>
                        ? This action soft-deletes the doctor from active rosters.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                {/* Appointment Conflict Notice */}
                {appointmentConflict ? (
                    <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
                        <div className="flex items-center gap-2 font-semibold text-sm">
                            <Calendar className="h-4 w-4" />
                            Active Appointments Detected
                        </div>
                        <p>{appointmentConflict.message}</p>
                        <p className="text-muted-foreground">
                            You must complete or cancel all future scheduled appointments before this doctor can be deleted.
                        </p>
                        <div className="pt-1">
                            <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="w-full text-xs gap-1.5"
                                onClick={() => handleClose(false)}
                            >
                                <Link href={`/appointments?doctorId=${doctor._id}`}>
                                    View Doctor&apos;s Appointments
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 py-2">
                        {isLoadingPatients && initialPatientCount === undefined ? (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                Checking assigned patient roster...
                            </div>
                        ) : isPatientsError ? (
                            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <span className="font-semibold block">Failed to load patient roster</span>
                                    <span>Could not verify assigned patient count for this doctor.</span>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => refetchPatients()}
                                    className="h-7 text-xs border-destructive/30 text-destructive hover:bg-destructive/20 self-start sm:self-center"
                                >
                                    Retry
                                </Button>
                            </div>
                        ) : patientCount > 0 ? (
                            <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
                                <div className="flex items-center gap-2 font-semibold text-sm">
                                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    Patient Reassignment Required
                                </div>
                                <p>
                                    Dr. {doctor.name} currently has{" "}
                                    <span className="font-bold">{patientCount}</span> assigned{" "}
                                    {patientCount === 1 ? "patient" : "patients"}. You must select a practitioner to inherit their roster.
                                </p>

                                <div className="space-y-1.5 pt-2">
                                    <Label htmlFor="reassign-select" className="text-xs font-semibold">
                                        Reassign Patients To *
                                    </Label>
                                    <Select
                                        value={reassignDoctorId}
                                        onValueChange={setReassignDoctorId}
                                        disabled={deleteMutation.isPending || isLoadingDoctors}
                                    >
                                        <SelectTrigger id="reassign-select" className="w-full bg-background text-foreground" aria-label="Reassign patients to practitioner">
                                            <SelectValue
                                                placeholder={
                                                    isLoadingDoctors
                                                        ? "Loading available doctors..."
                                                        : "Select practitioner to inherit roster"
                                                }
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableReassignDoctors.length === 0 ? (
                                                <SelectItem value="none" disabled>
                                                    No other doctors available for reassignment
                                                </SelectItem>
                                            ) : (
                                                availableReassignDoctors.map((d) => (
                                                    <SelectItem key={d._id} value={d._id}>
                                                        {d.name} — {d.specialization} ({d.hospital})
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground">
                                Dr. {doctor.name} has no assigned patients. Deletion will take effect immediately.
                            </p>
                        )}
                    </div>
                )}

                <AlertDialogFooter>
                    <AlertDialogCancel
                        disabled={deleteMutation.isPending}
                        onClick={() => handleClose(false)}
                    >
                        Cancel
                    </AlertDialogCancel>
                    {!appointmentConflict && (
                        <Button
                            variant="destructive"
                            onClick={() => deleteMutation.mutate()}
                            disabled={
                                deleteMutation.isPending ||
                                !isPatientCountKnown ||
                                isPatientsError ||
                                (patientCount > 0 && !reassignDoctorId)
                            }
                        >
                            {deleteMutation.isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            {patientCount > 0 ? "Reassign & Delete Doctor" : "Delete Doctor"}
                        </Button>
                    )}
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

