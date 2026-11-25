"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    CalendarPlus,
    Clock,
    User,
    Stethoscope,
    Loader2,
    AlertCircle,
    Info,
    Calendar as CalendarIcon,
} from "lucide-react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { useAuth } from "@/components/providers/auth-provider";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type {
    ApiResponse,
    Doctor,
    Patient,
    DoctorAvailabilityResponse,
    AvailabilitySlot,
} from "@/types";

interface BookAppointmentDialogProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    initialDoctorId?: string;
    initialPatientId?: string;
    trigger?: React.ReactNode;
}

export function BookAppointmentDialog({
    open: controlledOpen,
    onOpenChange: setControlledOpen,
    initialDoctorId,
    initialPatientId,
    trigger,
}: BookAppointmentDialogProps) {
    const { user, role } = useAuth();
    const queryClient = useQueryClient();

    const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : uncontrolledOpen;
    const setOpen = isControlled ? (setControlledOpen ?? (() => {})) : setUncontrolledOpen;

    const isDoctorUser = role === "doctor" && !!user?.doctorId;
    const defaultDoctorId = isDoctorUser ? user.doctorId! : initialDoctorId || "";

    const [selectedDoctorIdOverride, setSelectedDoctorIdOverride] = useState<string | null>(null);
    const selectedDoctorId = selectedDoctorIdOverride ?? defaultDoctorId;

    // Fetch active doctors (for admin/staff selection)
    const { data: doctorsData, isLoading: isLoadingDoctors } = useQuery({
        queryKey: qk.doctors.list("limit=100"),
        queryFn: () =>
            api.get<ApiResponse<{ doctors: Doctor[] }>>("/doctors?limit=100"),
        enabled: open && !isDoctorUser,
    });

    const doctors = doctorsData?.data?.doctors || [];
    const activeDoctor = isDoctorUser
        ? doctors.find((d) => d._id === user?.doctorId)
        : doctors.find((d) => d._id === selectedDoctorId);

    const doctorTimezone = activeDoctor?.timezone || "UTC";

    const getDoctorTodayStr = (tz: string) => {
        try {
            return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
        } catch {
            return format(new Date(), "yyyy-MM-dd");
        }
    };

    const doctorTodayStr = useMemo(() => {
        return getDoctorTodayStr(doctorTimezone);
    }, [doctorTimezone]);

    const [selectedDate, setSelectedDate] = useState<string>(() =>
        getDoctorTodayStr(activeDoctor?.timezone || "UTC")
    );
    const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
    const [selectedPatientId, setSelectedPatientId] = useState<string>(() => initialPatientId || "");
    const [reason, setReason] = useState<string>("");
    const [patientSearch, setPatientSearch] = useState<string>("");

    // Synchronize selectedDate when doctor changes or dialog opens (do not rely on initial useState)
    const [prevDoctorId, setPrevDoctorId] = useState(selectedDoctorId);
    if (selectedDoctorId !== prevDoctorId) {
        setPrevDoctorId(selectedDoctorId);
        setSelectedDate(getDoctorTodayStr(doctorTimezone));
        setSelectedSlot(null);
    }

    const [prevOpen, setPrevOpen] = useState(open);
    if (open !== prevOpen) {
        setPrevOpen(open);
        if (open) {
            setSelectedDate(getDoctorTodayStr(doctorTimezone));
            setSelectedSlot(null);
            if (initialPatientId) {
                setSelectedPatientId(initialPatientId);
            }
        }
    }

    const resetForm = () => {
        setSelectedDoctorIdOverride(null);
        setSelectedDate(getDoctorTodayStr(doctorTimezone));
        setSelectedSlot(null);
        setSelectedPatientId(initialPatientId || "");
        setReason("");
        setPatientSearch("");
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (newOpen) {
            setSelectedDate(getDoctorTodayStr(doctorTimezone));
            setSelectedSlot(null);
        } else {
            resetForm();
        }
        setOpen(newOpen);
    };

    // Fetch availability for the selected doctor and date
    const {
        data: availabilityData,
        isLoading: isLoadingAvailability,
        refetch: refetchAvailability,
    } = useQuery({
        queryKey: qk.doctors.availability(selectedDoctorId, selectedDate, 1),
        queryFn: () =>
            api.get<ApiResponse<DoctorAvailabilityResponse>>(
                `/doctors/${selectedDoctorId}/availability?date=${selectedDate}&days=1`
            ),
        enabled: open && !!selectedDoctorId && !!selectedDate,
    });

    // Fetch assigned patients under the selected doctor
    const { data: patientsData, isLoading: isLoadingPatients } = useQuery({
        queryKey: qk.doctors.patients(selectedDoctorId, "limit=100"),
        queryFn: () =>
            api.get<ApiResponse<{ patients: Patient[] }>>(
                `/doctors/${selectedDoctorId}/patients?limit=100`
            ),
        enabled: open && !!selectedDoctorId,
    });

    const rawPatients = patientsData?.data?.patients;
    const assignedPatients = useMemo(() => rawPatients || [], [rawPatients]);
    const slots = availabilityData?.data?.days?.[0]?.slots || [];

    const filteredPatients = useMemo(() => {
        if (!patientSearch.trim()) return assignedPatients;
        const q = patientSearch.toLowerCase().trim();
        return assignedPatients.filter(
            (p) =>
                p.name.toLowerCase().includes(q) ||
                p.phone.toLowerCase().includes(q) ||
                p.condition?.toLowerCase().includes(q)
        );
    }, [assignedPatients, patientSearch]);

    // Format local wall-clock time string from UTC ISO for buttons
    const formatSlotTime = (isoString: string) => {
        try {
            return new Intl.DateTimeFormat("en-US", {
                timeZone: doctorTimezone,
                hour: "2-digit",
                minute: "2-digit",
                hourCycle: "h23",
            }).format(new Date(isoString));
        } catch {
            return format(new Date(isoString), "HH:mm");
        }
    };

    const bookMutation = useMutation({
        mutationFn: async () => {
            if (!selectedDoctorId || !selectedPatientId || !selectedSlot) {
                throw new Error("Missing required appointment fields");
            }
            return api.post("/appointments", {
                doctorId: selectedDoctorId,
                patientId: selectedPatientId,
                startsAt: selectedSlot.startsAt,
                reason: reason.trim() ? reason.trim() : undefined,
            });
        },
        onSuccess: () => {
            toast.success("Appointment booked successfully", {
                description: `Scheduled with Dr. ${activeDoctor?.name || "Practitioner"} on ${selectedDate}.`,
            });
            queryClient.invalidateQueries({ queryKey: qk.appointments.all() });
            queryClient.invalidateQueries({
                queryKey: qk.doctors.availability(selectedDoctorId, selectedDate, 1),
            });
            queryClient.invalidateQueries({ queryKey: qk.dashboard.appointments() });
            resetForm();
            setOpen(false);
        },
        onError: (err: unknown) => {
            if (err instanceof ApiError) {
                if (err.code === "SLOT_TAKEN") {
                    toast.error("Slot Unavailable", {
                        description: "That slot was just booked. Please pick another available time.",
                    });
                    refetchAvailability();
                    setSelectedSlot(null);
                    return;
                }
                if (err.code === "PATIENT_DOUBLE_BOOKED") {
                    toast.error("Patient Schedule Conflict", {
                        description: "This patient already has an overlapping appointment at this time.",
                    });
                    return;
                }
                if (err.code === "OUTSIDE_WORKING_HOURS") {
                    toast.error("Schedule Conflict", {
                        description: "The requested time is outside the doctor's active clinical hours.",
                    });
                    refetchAvailability();
                    setSelectedSlot(null);
                    return;
                }
                toast.error("Booking Failed", { description: err.message });
            } else {
                toast.error("Booking Failed", {
                    description: "An unexpected error occurred while booking the appointment.",
                });
            }
        },
    });

    const isReadyToSubmit =
        !!selectedDoctorId &&
        !!selectedPatientId &&
        !!selectedSlot &&
        !bookMutation.isPending;

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            {trigger ? (
                <DialogTrigger asChild>{trigger}</DialogTrigger>
            ) : (
                <DialogTrigger asChild>
                    <Button className="gap-2 shadow-xs cursor-pointer">
                        <CalendarPlus className="h-4 w-4" />
                        New Appointment
                    </Button>
                </DialogTrigger>
            )}

            <DialogContent className="sm:max-w-[580px] max-h-[92vh] flex flex-col">
                <DialogHeader className="border-b pb-3">
                    <DialogTitle className="flex items-center gap-2">
                        <CalendarPlus className="h-5 w-5 text-primary" />
                        Book Appointment
                    </DialogTitle>
                    <DialogDescription>
                        Schedule a clinical consultation with practitioner slot availability.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
                    {/* Doctor Selection */}
                    <div className="space-y-1.5">
                        <Label htmlFor="book-doctor" className="flex items-center gap-1.5 text-xs font-semibold">
                            <Stethoscope className="h-3.5 w-3.5 text-primary" />
                            Doctor Practitioner *
                        </Label>
                        {isDoctorUser ? (
                            <div className="rounded-md border bg-muted/40 p-2.5 text-xs">
                                <span className="font-semibold text-foreground">
                                    {user?.name}
                                </span>{" "}
                                <span className="text-muted-foreground">
                                    (Your clinical schedule)
                                </span>
                            </div>
                        ) : (
                            <Select
                                value={selectedDoctorId}
                                onValueChange={(id) => {
                                    const nextDoc = doctors.find((d) => d._id === id);
                                    const nextTz = nextDoc?.timezone || "UTC";
                                    setSelectedDoctorIdOverride(id);
                                    setSelectedDate(getDoctorTodayStr(nextTz));
                                    setSelectedSlot(null);
                                    setSelectedPatientId("");
                                    setPatientSearch("");
                                }}
                                disabled={bookMutation.isPending || isLoadingDoctors}
                            >
                                <SelectTrigger id="book-doctor" className="text-xs" aria-label="Doctor practitioner">
                                    <SelectValue
                                        placeholder={
                                            isLoadingDoctors
                                                ? "Loading practitioners..."
                                                : "Select practitioner"
                                        }
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {doctors.map((d) => (
                                        <SelectItem key={d._id} value={d._id} className="text-xs">
                                            {d.name} — {d.specialization} ({d.hospital})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>

                    {/* Date Picker */}
                    <div className="space-y-1.5">
                        <Label htmlFor="book-date" className="flex items-center gap-1.5 text-xs font-semibold">
                            <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                            Consultation Date *
                        </Label>
                        <Input
                            id="book-date"
                            type="date"
                            min={doctorTodayStr}
                            value={selectedDate}
                            onChange={(e) => {
                                setSelectedDate(e.target.value);
                                setSelectedSlot(null);
                            }}
                            className="text-xs"
                            disabled={bookMutation.isPending || !selectedDoctorId}
                        />
                    </div>

                    {/* Available Slots Grid */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-1.5 text-xs font-semibold">
                                <Clock className="h-3.5 w-3.5 text-primary" />
                                Available Time Slot *
                            </Label>
                            {selectedDoctorId && (
                                <span className="text-[11px] text-muted-foreground">
                                    Times in {doctorTimezone}
                                </span>
                            )}
                        </div>

                        {!selectedDoctorId ? (
                            <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                                Select a doctor to see availability.
                            </div>
                        ) : isLoadingAvailability ? (
                            <div className="flex items-center justify-center gap-2 rounded-lg border p-6 text-xs text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                Checking available consultation slots...
                            </div>
                        ) : slots.length === 0 ? (
                            <div className="rounded-lg border border-amber-200/60 bg-amber-50/50 p-4 text-center text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
                                <AlertCircle className="mx-auto h-5 w-5 mb-1.5 text-amber-600 dark:text-amber-400" />
                                No slots scheduled for Dr. {activeDoctor?.name || "this practitioner"} on this date.
                                <p className="text-[11px] text-muted-foreground mt-1">
                                    Please choose another date or check their weekly clinical schedule.
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
                                            disabled={!slot.available || bookMutation.isPending}
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
                                Selected slot: {formatSlotTime(selectedSlot.startsAt)} – {formatSlotTime(selectedSlot.endsAt)} ({doctorTimezone})
                            </p>
                        )}
                    </div>

                    {/* Patient Selection */}
                    <div className="space-y-1.5">
                        <Label htmlFor="book-patient" className="flex items-center gap-1.5 text-xs font-semibold">
                            <User className="h-3.5 w-3.5 text-primary" />
                            Assigned Patient *
                        </Label>
                        {!selectedDoctorId ? (
                            <div className="rounded-md border bg-muted/30 p-2 text-xs text-muted-foreground">
                                Select a doctor first to list their assigned patients.
                            </div>
                        ) : isLoadingPatients ? (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Loading assigned patients...
                            </div>
                        ) : assignedPatients.length === 0 ? (
                            <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
                                <p className="font-semibold">No assigned patients found</p>
                                <p className="mt-0.5">
                                    Dr. {activeDoctor?.name || "this doctor"} currently has no assigned patients. Patients must be assigned to this practitioner before booking.
                                </p>
                                <Button
                                    asChild
                                    size="sm"
                                    variant="outline"
                                    className="mt-2 text-xs h-7"
                                    onClick={() => setOpen(false)}
                                >
                                    <Link href="/patients">Go to Patients</Link>
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Input
                                    type="text"
                                    placeholder="Search patient by name, phone, condition..."
                                    value={patientSearch}
                                    onChange={(e) => setPatientSearch(e.target.value)}
                                    className="h-8 text-xs"
                                    disabled={bookMutation.isPending}
                                />
                                <Select
                                    value={selectedPatientId}
                                    onValueChange={setSelectedPatientId}
                                    disabled={bookMutation.isPending}
                                >
                                    <SelectTrigger id="book-patient" className="text-xs" aria-label="Assigned patient">
                                        <SelectValue placeholder="Select patient" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filteredPatients.length === 0 ? (
                                            <div className="p-2 text-xs text-muted-foreground text-center">
                                                No matching patients found
                                            </div>
                                        ) : (
                                            filteredPatients.map((p) => (
                                                <SelectItem key={p._id} value={p._id} className="text-xs">
                                                    {p.name} ({p.phone}) — {p.condition}
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    {/* Reason */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="book-reason" className="text-xs font-semibold">
                                Consultation Reason (Optional)
                            </Label>
                            <span className="text-[10px] text-muted-foreground">
                                {reason.length}/300
                            </span>
                        </div>
                        <Textarea
                            id="book-reason"
                            placeholder="Primary symptoms or checkup intent..."
                            maxLength={300}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            disabled={bookMutation.isPending}
                            className="text-xs resize-none h-18"
                        />
                    </div>
                </div>

                <DialogFooter className="border-t pt-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setOpen(false)}
                        disabled={bookMutation.isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={() => bookMutation.mutate()}
                        disabled={!isReadyToSubmit}
                    >
                        {bookMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Confirm Booking
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
