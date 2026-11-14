"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Calendar,
    Clock,
    User,
    Stethoscope,
    Building2,
    Phone,
    FileText,
    CheckCircle2,
    XCircle,
    AlertCircle,
    CalendarClock,
    Ban,
    ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { useAuth } from "@/components/providers/auth-provider";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CancelAppointmentDialog } from "@/components/appointments/cancel-appointment-dialog";
import { RescheduleDialog } from "@/components/appointments/reschedule-dialog";
import type { Appointment, AppointmentStatus, Doctor, Patient } from "@/types";

interface AppointmentDetailsDialogProps {
    appointment: Appointment | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AppointmentDetailsDialog({
    appointment,
    open,
    onOpenChange,
}: AppointmentDetailsDialogProps) {
    const { role } = useAuth();
    const queryClient = useQueryClient();

    const [cancelOpen, setCancelOpen] = useState(false);
    const [rescheduleOpen, setRescheduleOpen] = useState(false);
    const [mountedAt] = useState(() => Date.now());

    const isViewer = role === "viewer";

    const updateStatusMutation = useMutation({
        mutationFn: async (newStatus: "completed" | "no_show") => {
            if (!appointment) throw new Error("No appointment selected");
            return api.patch(`/appointments/${appointment._id}/status`, {
                status: newStatus,
            });
        },
        onSuccess: (_, newStatus) => {
            toast.success(
                newStatus === "completed"
                    ? "Appointment marked completed"
                    : "Appointment marked as no-show",
                {
                    description: "Appointment record has been updated.",
                }
            );
            queryClient.invalidateQueries({ queryKey: qk.appointments.all() });
            queryClient.invalidateQueries({ queryKey: qk.dashboard.appointments() });
            onOpenChange(false);
        },
        onError: (err: unknown) => {
            if (err instanceof ApiError) {
                if (err.code === "INVALID_STATUS_TRANSITION") {
                    toast.error("Status Conflict", {
                        description: "This appointment's status has already been modified. Refreshing.",
                    });
                    queryClient.invalidateQueries({ queryKey: qk.appointments.all() });
                    onOpenChange(false);
                    return;
                }
                toast.error("Update Failed", { description: err.message });
            } else {
                toast.error("Update Failed", {
                    description: "An unexpected error occurred while updating status.",
                });
            }
        },
    });

    if (!appointment) return null;

    const patient =
        typeof appointment.patientId === "object" && appointment.patientId !== null
            ? (appointment.patientId as Patient)
            : null;

    const doctor =
        typeof appointment.doctorId === "object" && appointment.doctorId !== null
            ? (appointment.doctorId as Doctor)
            : null;

    const patientName = patient?.name || "Patient";
    const doctorName = doctor?.name || "Practitioner";
    const doctorTimezone = doctor?.timezone || "UTC";

    const startsAtDate = new Date(appointment.startsAt);
    const isPastAppointment = startsAtDate.getTime() <= mountedAt;
    const isTerminalStatus =
        appointment.status === "completed" ||
        appointment.status === "cancelled" ||
        appointment.status === "no_show";

    const formatInTimezone = (dateStr: string) => {
        try {
            return new Intl.DateTimeFormat("en-US", {
                timeZone: doctorTimezone,
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hourCycle: "h23",
            }).format(new Date(dateStr));
        } catch {
            return format(new Date(dateStr), "MMM d, yyyy HH:mm");
        }
    };

    const getStatusBadge = (status: AppointmentStatus) => {
        switch (status) {
            case "scheduled":
                return (
                    <Badge variant="outline" className="border-blue-500/40 text-blue-600 bg-blue-50/50 dark:bg-blue-950/20 gap-1.5 py-1">
                        <Clock className="h-3 w-3" />
                        Scheduled
                    </Badge>
                );
            case "completed":
                return (
                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 gap-1.5 py-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Completed
                    </Badge>
                );
            case "cancelled":
                return (
                    <Badge variant="outline" className="border-rose-500/40 text-rose-600 bg-rose-50/50 dark:bg-rose-950/20 gap-1.5 py-1">
                        <XCircle className="h-3 w-3" />
                        Cancelled
                    </Badge>
                );
            case "no_show":
                return (
                    <Badge variant="outline" className="border-amber-500/40 text-amber-600 bg-amber-50/50 dark:bg-amber-950/20 gap-1.5 py-1">
                        <AlertCircle className="h-3 w-3" />
                        No-Show
                    </Badge>
                );
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[540px] max-h-[90vh] flex flex-col">
                    <DialogHeader className="border-b pb-3">
                        <div className="flex items-center justify-between gap-2 pr-6">
                            <DialogTitle className="flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-primary" />
                                Appointment Details
                            </DialogTitle>
                            {getStatusBadge(appointment.status)}
                        </div>
                        <DialogDescription className="text-xs">
                            Clinical consultation record ID: <span className="font-mono">{appointment._id}</span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
                        {/* Time & Practitioner Timezone */}
                        <div className="rounded-lg border bg-primary/5 p-3.5 space-y-1">
                            <div className="text-xs text-muted-foreground flex items-center justify-between">
                                <span className="font-semibold text-foreground flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5 text-primary" />
                                    Scheduled Consultation Window
                                </span>
                                <span className="text-[11px] font-mono">
                                    {doctorTimezone}
                                </span>
                            </div>
                            <div className="text-base font-semibold text-foreground">
                                {formatInTimezone(appointment.startsAt)} – {formatInTimezone(appointment.endsAt)}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                                Local system time: {format(new Date(appointment.startsAt), "PPp")}
                            </div>
                        </div>

                        {/* Patient & Doctor Two-Column Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Patient Card */}
                            <div className="rounded-lg border bg-card p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                        <User className="h-3.5 w-3.5 text-primary" />
                                        Patient
                                    </span>
                                    {patient?._id && (
                                        <Button asChild variant="ghost" size="sm" className="h-6 w-6 p-0">
                                            <Link href={`/patients?search=${encodeURIComponent(patient.name)}`}>
                                                <ArrowUpRight className="h-3.5 w-3.5" />
                                            </Link>
                                        </Button>
                                    )}
                                </div>
                                <div>
                                    <div className="font-semibold text-foreground text-sm">
                                        {patientName}
                                    </div>
                                    {patient?.phone && (
                                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                            <Phone className="h-3 w-3" />
                                            {patient.phone}
                                        </div>
                                    )}
                                    {patient?.condition && (
                                        <div className="text-xs text-muted-foreground mt-1">
                                            Condition: <span className="text-foreground">{patient.condition}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Doctor Card */}
                            <div className="rounded-lg border bg-card p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                        <Stethoscope className="h-3.5 w-3.5 text-primary" />
                                        Practitioner
                                    </span>
                                    {doctor?._id && (
                                        <Button asChild variant="ghost" size="sm" className="h-6 w-6 p-0">
                                            <Link href={`/doctors/${doctor._id}`}>
                                                <ArrowUpRight className="h-3.5 w-3.5" />
                                            </Link>
                                        </Button>
                                    )}
                                </div>
                                <div>
                                    <div className="font-semibold text-foreground text-sm">
                                        {doctorName}
                                    </div>
                                    {doctor?.specialization && (
                                        <div className="text-xs text-muted-foreground">
                                            {doctor.specialization}
                                        </div>
                                    )}
                                    {doctor?.hospital && (
                                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                            <Building2 className="h-3 w-3" />
                                            {doctor.hospital}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Reason Note */}
                        {appointment.reason && (
                            <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                    <FileText className="h-3.5 w-3.5 text-primary" />
                                    Consultation Reason
                                </span>
                                <p className="text-xs text-foreground whitespace-pre-wrap">
                                    {appointment.reason}
                                </p>
                            </div>
                        )}

                        {/* Cancellation Reason */}
                        {appointment.status === "cancelled" && appointment.cancelReason && (
                            <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-3 dark:border-rose-950 dark:bg-rose-950/20 space-y-1">
                                <span className="text-xs font-semibold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                                    <Ban className="h-3.5 w-3.5" />
                                    Cancellation Details
                                </span>
                                <p className="text-xs text-rose-900 dark:text-rose-200 whitespace-pre-wrap">
                                    {appointment.cancelReason}
                                </p>
                            </div>
                        )}

                        {/* Future Appointment Status Warning if trying to complete */}
                        {!isTerminalStatus && !isPastAppointment && !isViewer && (
                            <div className="rounded-lg border border-blue-200/60 bg-blue-50/50 p-2.5 text-xs text-blue-900 dark:border-blue-950 dark:bg-blue-950/20 dark:text-blue-200">
                                <span className="font-semibold">Future Appointment:</span> Completion and No-Show statuses become available once the appointment start time has passed.
                            </div>
                        )}

                        {/* Action Buttons for Non-Viewers */}
                        {!isViewer && !isTerminalStatus && (
                            <div className="border-t pt-3 space-y-2">
                                <span className="text-xs font-semibold text-muted-foreground block">
                                    Available Actions
                                </span>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={!isPastAppointment || updateStatusMutation.isPending}
                                        onClick={() => updateStatusMutation.mutate("completed")}
                                        className="text-xs h-8 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 dark:text-emerald-400"
                                        title={!isPastAppointment ? "Available after consultation start time" : ""}
                                    >
                                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                        Complete
                                    </Button>

                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={!isPastAppointment || updateStatusMutation.isPending}
                                        onClick={() => updateStatusMutation.mutate("no_show")}
                                        className="text-xs h-8 text-amber-700 hover:text-amber-800 hover:bg-amber-50 dark:text-amber-400"
                                        title={!isPastAppointment ? "Available after consultation start time" : ""}
                                    >
                                        <AlertCircle className="h-3.5 w-3.5 mr-1" />
                                        No-Show
                                    </Button>

                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setRescheduleOpen(true)}
                                        className="text-xs h-8 gap-1"
                                    >
                                        <CalendarClock className="h-3.5 w-3.5" />
                                        Reschedule
                                    </Button>

                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setCancelOpen(true)}
                                        className="text-xs h-8 text-rose-700 hover:text-rose-800 hover:bg-rose-50 dark:text-rose-400"
                                    >
                                        <Ban className="h-3.5 w-3.5 mr-1" />
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Cancel Dialog */}
            <CancelAppointmentDialog
                appointment={appointment}
                open={cancelOpen}
                onOpenChange={setCancelOpen}
                onCancelled={() => onOpenChange(false)}
            />

            {/* Reschedule Dialog */}
            <RescheduleDialog
                appointment={appointment}
                open={rescheduleOpen}
                onOpenChange={setRescheduleOpen}
                onRescheduled={() => onOpenChange(false)}
            />
        </>
    );
}
