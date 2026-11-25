"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Ban, Loader2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import type { Appointment } from "@/types";

interface CancelAppointmentDialogProps {
    appointment: Appointment | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCancelled?: () => void;
}

export function CancelAppointmentDialog({
    appointment,
    open,
    onOpenChange,
    onCancelled,
}: CancelAppointmentDialogProps) {
    const queryClient = useQueryClient();
    const [cancelReason, setCancelReason] = useState("");

    const cancelMutation = useMutation({
        mutationFn: async () => {
            if (!appointment) throw new Error("No appointment selected");
            return api.patch(`/appointments/${appointment._id}/status`, {
                status: "cancelled",
                cancelReason: cancelReason.trim() ? cancelReason.trim() : undefined,
            });
        },
        onSuccess: () => {
            toast.success("Appointment cancelled", {
                description: "The appointment has been marked as cancelled.",
            });
            queryClient.invalidateQueries({ queryKey: qk.appointments.all() });
            queryClient.invalidateQueries({ queryKey: qk.dashboard.appointments() });
            setCancelReason("");
            onOpenChange(false);
            onCancelled?.();
        },
        onError: (err: unknown) => {
            if (err instanceof ApiError) {
                if (err.code === "INVALID_STATUS_TRANSITION") {
                    toast.error("Status Conflict", {
                        description: "This appointment's status was modified by another user. Refreshing view.",
                    });
                    queryClient.invalidateQueries({ queryKey: qk.appointments.all() });
                    onOpenChange(false);
                    return;
                }
                toast.error("Cancellation Failed", { description: err.message });
            } else {
                toast.error("Cancellation Failed", {
                    description: "An unexpected error occurred while cancelling the appointment.",
                });
            }
        },
    });

    if (!appointment) return null;

    const patientName =
        typeof appointment.patientId === "object" && appointment.patientId !== null
            ? appointment.patientId.name
            : "Patient";

    return (
        <AlertDialog
            open={open}
            onOpenChange={(next) => {
                if (!cancelMutation.isPending) {
                    if (!next) setCancelReason("");
                    onOpenChange(next);
                }
            }}
        >
            <AlertDialogContent className="sm:max-w-[480px]">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                        <Ban className="h-5 w-5" />
                        Cancel Appointment
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to cancel the scheduled consultation for{" "}
                        <span className="font-semibold text-foreground">{patientName}</span>?
                        This will release the practitioner slot.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-1.5 py-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="cancel-reason" className="text-xs font-semibold">
                            Cancellation Reason (Optional)
                        </Label>
                        <span className="text-[10px] text-muted-foreground">
                            {cancelReason.length}/300
                        </span>
                    </div>
                    <Textarea
                        id="cancel-reason"
                        placeholder="e.g., Patient requested rescheduling, doctor unavailable..."
                        maxLength={300}
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        disabled={cancelMutation.isPending}
                        className="text-xs resize-none h-20"
                    />
                </div>

                <AlertDialogFooter>
                    <AlertDialogCancel disabled={cancelMutation.isPending}>
                        Keep Appointment
                    </AlertDialogCancel>
                    <Button
                        variant="destructive"
                        onClick={() => cancelMutation.mutate()}
                        disabled={cancelMutation.isPending}
                    >
                        {cancelMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Confirm Cancellation
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

