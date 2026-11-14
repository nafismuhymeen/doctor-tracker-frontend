"use client";

import { useState } from "react";
import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    CalendarClock,
    Clock,
    Loader2,
    AlertCircle,
    Calendar as CalendarIcon,
    Info,
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type {
    ApiResponse,
    Appointment,
    AvailabilitySlot,
    DoctorAvailabilityResponse,
} from "@/types";

interface RescheduleDialogProps {
    appointment: Appointment | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onRescheduled?: () => void;
}

export function RescheduleDialog({
    appointment,
    open,
    onOpenChange,
    onRescheduled,
}: RescheduleDialogProps) {
    const queryClient = useQueryClient();

    const doctorId =
        typeof appointment?.doctorId === "object" && appointment?.doctorId !== null
            ? appointment.doctorId._id
            : (appointment?.doctorId as string) || "";

    const doctorName =
        typeof appointment?.doctorId === "object" && appointment?.doctorId !== null
            ? appointment.doctorId.name
            : "Practitioner";

    const doctorTimezone =
        typeof appointment?.doctorId === "object" && appointment?.doctorId !== null
            ? appointment.doctorId.timezone || "UTC"
            : "UTC";

    const patientName =
        typeof appointment?.patientId === "object" && appointment?.patientId !== null
            ? appointment.patientId.name
            : "Patient";

    const [selectedDate, setSelectedDate] = useState<string>(() =>
        format(new Date(), "yyyy-MM-dd")
    );
    const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            setSelectedDate(format(new Date(), "yyyy-MM-dd"));
            setSelectedSlot(null);
        }
        onOpenChange(newOpen);
    };

    // Fetch availability slots for doctor on new date
    const {
        data: availabilityData,
        isLoading: isLoadingAvailability,
        refetch: refetchAvailability,
    } = useQuery({
        queryKey: qk.doctors.availability(doctorId, selectedDate, 1),
        queryFn: () =>
            api.get<ApiResponse<DoctorAvailabilityResponse>>(
                `/doctors/${doctorId}/availability?date=${selectedDate}&days=1`
            ),
        enabled: open && !!doctorId && !!selectedDate,
    });

    const slots = availabilityData?.data?.days?.[0]?.slots || [];

    const formatSlotTime = (isoString: string) => {
        try {
            return new Intl.DateTimeFormat("en-US", {
                timeZone: doctorTimezone,
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
            }).format(new Date(isoString));
        } catch {
            return format(new Date(isoString), "HH:mm");
        }
    };

    const rescheduleMutation = useMutation({
        mutationFn: async () => {
            if (!appointment || !selectedSlot) throw new Error("No slot selected");
            return api.patch(`/appointments/${appointment._id}/reschedule`, {
                startsAt: selectedSlot.startsAt,
            });
        },
        onSuccess: () => {
            toast.success("Appointment rescheduled successfully", {
                description: `New consultation time confirmed for ${patientName}.`,
            });
            queryClient.invalidateQueries({ queryKey: qk.appointments.all() });
            queryClient.invalidateQueries({
                queryKey: qk.doctors.availability(doctorId, selectedDate, 1),
            });
            queryClient.invalidateQueries({ queryKey: qk.dashboard.appointments() });
            onOpenChange(false);
            onRescheduled?.();
        },
        onError: (err: unknown) => {
            if (err instanceof ApiError) {
                if (err.code === "SLOT_TAKEN") {
                    toast.error("Slot Unavailable", {
                        description: "That slot was just booked by another patient. Please choose another.",
                    });
                    refetchAvailability();
                    setSelectedSlot(null);
                    return;
                }
                if (err.code === "PATIENT_DOUBLE_BOOKED") {
                    toast.error("Patient Schedule Conflict", {
                        description: "The patient already has an appointment during this time window.",
                    });
                    return;
                }
                if (err.code === "OUTSIDE_WORKING_HOURS") {
                    toast.error("Schedule Conflict", {
                        description: "Selected slot is outside the doctor's active clinical hours.",
                    });
                    refetchAvailability();
                    setSelectedSlot(null);
                    return;
                }
                toast.error("Reschedule Failed", { description: err.message });
            } else {
                toast.error("Reschedule Failed", {
                    description: "An unexpected error occurred while rescheduling the appointment.",
                });
            }
        },
    });

    if (!appointment) return null;

    const todayDateStr = format(new Date(), "yyyy-MM-dd");

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[520px] max-h-[90vh] flex flex-col">
                <DialogHeader className="border-b pb-3">
                    <DialogTitle className="flex items-center gap-2">
                        <CalendarClock className="h-5 w-5 text-primary" />
                        Reschedule Appointment
                    </DialogTitle>
                    <DialogDescription>
                        Select a new available time slot for{" "}
                        <span className="font-semibold text-foreground">{patientName}</span> with Dr. {doctorName}.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
                    {/* Date Picker */}
                    <div className="space-y-1.5">
                        <Label htmlFor="reschedule-date" className="flex items-center gap-1.5 text-xs font-semibold">
                            <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                            Select New Date *
                        </Label>
                        <Input
                            id="reschedule-date"
                            type="date"
                            min={todayDateStr}
                            value={selectedDate}
                            onChange={(e) => {
                                setSelectedDate(e.target.value);
                                setSelectedSlot(null);
                            }}
                            className="text-xs"
                            disabled={rescheduleMutation.isPending}
                        />
                    </div>

                    {/* Slots Grid */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-1.5 text-xs font-semibold">
                                <Clock className="h-3.5 w-3.5 text-primary" />
                                Available Time Slots *
                            </Label>
                            <span className="text-[11px] text-muted-foreground">
                                Times in {doctorTimezone}
                            </span>
                        </div>

                        {isLoadingAvailability ? (
                            <div className="flex items-center justify-center gap-2 rounded-lg border p-6 text-xs text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                Checking available slots for Dr. {doctorName}...
                            </div>
                        ) : slots.length === 0 ? (
                            <div className="rounded-lg border border-amber-200/60 bg-amber-50/50 p-4 text-center text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
                                <AlertCircle className="mx-auto h-5 w-5 mb-1.5 text-amber-600 dark:text-amber-400" />
                                No available slots on this date.
                                <p className="text-[11px] text-muted-foreground mt-1">
                                    Please select another date on the calendar.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 border rounded-lg bg-muted/10">
                                {slots.map((slot, i) => {
                                    const isSelected = selectedSlot?.startsAt === slot.startsAt;
                                    return (
                                        <button
                                            key={i}
                                            type="button"
                                            disabled={!slot.available || rescheduleMutation.isPending}
                                            aria-label={`${formatSlotTime(slot.startsAt)}, ${slot.available ? "available" : "unavailable"}`}
                                            onClick={() => setSelectedSlot(slot)}
                                            className={`px-2.5 py-1.5 rounded-md text-xs font-mono font-medium transition-colors text-center border ${
                                                isSelected
                                                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                                    : slot.available
                                                    ? "bg-background hover:bg-primary/10 hover:border-primary/40 text-foreground border-border"
                                                    : "bg-muted/40 text-muted-foreground/50 border-dashed cursor-not-allowed line-through"
                                            }`}
                                        >
                                            {formatSlotTime(slot.startsAt)}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {selectedSlot && (
                            <p className="text-[11px] text-primary font-medium flex items-center gap-1 mt-1">
                                <Info className="h-3.5 w-3.5" />
                                Reschedule to: {selectedDate} at {formatSlotTime(selectedSlot.startsAt)} – {formatSlotTime(selectedSlot.endsAt)} ({doctorTimezone})
                            </p>
                        )}
                    </div>
                </div>

                <DialogFooter className="border-t pt-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={rescheduleMutation.isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={() => rescheduleMutation.mutate()}
                        disabled={!selectedSlot || rescheduleMutation.isPending}
                    >
                        {rescheduleMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Confirm Reschedule
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
