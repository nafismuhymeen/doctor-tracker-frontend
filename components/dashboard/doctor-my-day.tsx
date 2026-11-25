"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format, startOfDay, endOfDay } from "date-fns";
import { TZDate } from "@date-fns/tz";
import { useQuery } from "@tanstack/react-query";
import {
    Calendar,
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Stethoscope,
    Users,
    ArrowRight,
    Loader2,
} from "lucide-react";

import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { useAuth } from "@/components/providers/auth-provider";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookAppointmentDialog } from "@/components/appointments/book-appointment-dialog";
import { AppointmentDetailsDialog } from "@/components/appointments/appointment-details-dialog";
import { AppointmentsDashboard } from "@/components/dashboard/appointments-dashboard";
import type {
    ApiResponse,
    Appointment,
    AppointmentsResponse,
    AppointmentStatus,
    Doctor,
    Patient,
} from "@/types";

export function DoctorMyDay() {
    const { user } = useAuth();
    const doctorId = user?.doctorId || "";

    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);

    // Fetch doctor profile for timezone
    const { data: doctorData } = useQuery({
        queryKey: qk.doctors.detail(doctorId),
        queryFn: () =>
            api.get<ApiResponse<{ doctor: Doctor }>>(`/doctors/${doctorId}`),
        enabled: !!doctorId,
    });
    const doctor = doctorData?.data?.doctor;
    const doctorTimezone = doctor?.timezone || "UTC";

    const doctorTodayDateStr = useMemo(() => {
        try {
            return new Intl.DateTimeFormat("en-CA", { timeZone: doctorTimezone }).format(new Date());
        } catch {
            return format(new Date(), "yyyy-MM-dd");
        }
    }, [doctorTimezone]);

    // Query today's appointments for this doctor in their timezone
    const { data: apptsResponse, isLoading: isLoadingToday } = useQuery({
        queryKey: qk.appointments.list(`doctor_today_${doctorId}_${doctorTodayDateStr}`),
        queryFn: () => {
            const todayInDoctorTz = new TZDate(new Date(), doctorTimezone);
            const todayStart = startOfDay(todayInDoctorTz);
            const todayEnd = endOfDay(todayInDoctorTz);
            return api.get<ApiResponse<AppointmentsResponse>>(
                `/appointments?doctorId=${doctorId}&from=${new Date(todayStart.getTime()).toISOString()}&to=${new Date(todayEnd.getTime()).toISOString()}&limit=50`
            );
        },
        enabled: !!doctorId && !!doctor,
    });

    const todayAppointments = useMemo(() => {
        const list = apptsResponse?.data?.appointments || [];
        return [...list].sort(
            (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
        );
    }, [apptsResponse?.data?.appointments]);

    const formatDoctorTime = (isoString: string) => {
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

    const headerDateStr = useMemo(() => {
        try {
            return new Intl.DateTimeFormat("en-US", {
                timeZone: doctorTimezone,
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
            }).format(new Date());
        } catch {
            return format(new Date(), "EEEE, MMMM d, yyyy");
        }
    }, [doctorTimezone]);

    const getStatusBadge = (status: AppointmentStatus) => {
        switch (status) {
            case "scheduled":
                return (
                    <Badge variant="outline" className="border-blue-500/40 text-blue-600 bg-blue-50/50 dark:bg-blue-950/20 text-[11px] gap-1">
                        <Clock className="h-3 w-3" />
                        Scheduled
                    </Badge>
                );
            case "completed":
                return (
                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 text-[11px] gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Completed
                    </Badge>
                );
            case "cancelled":
                return (
                    <Badge variant="outline" className="border-rose-500/40 text-rose-600 bg-rose-50/50 dark:bg-rose-950/20 text-[11px] gap-1">
                        <XCircle className="h-3 w-3" />
                        Cancelled
                    </Badge>
                );
            case "no_show":
                return (
                    <Badge variant="outline" className="border-amber-500/40 text-amber-600 bg-amber-50/50 dark:bg-amber-950/20 text-[11px] gap-1">
                        <AlertCircle className="h-3 w-3" />
                        No-Show
                    </Badge>
                );
        }
    };

    return (
        <div className="space-y-6">
            {/* Header: Greeting and Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Calendar className="h-6 w-6 text-primary" />
                        My Day
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {headerDateStr} • Clinical schedule for Dr. {doctor?.name || user?.name || "Doctor"} ({doctorTimezone})
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <BookAppointmentDialog initialDoctorId={doctorId} />
                    <Button asChild variant="outline" size="sm" className="h-9 text-xs gap-1.5">
                        <Link href="/appointments?view=week">
                            Full Calendar
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Today's Schedule Itinerary */}
            <Card className="shadow-xs">
                <CardHeader className="border-b pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <Clock className="h-4 w-4 text-primary" />
                                Today&apos;s Consultation Schedule
                            </CardTitle>
                            <CardDescription className="text-xs">
                                All appointments scheduled for you today in chronological order.
                            </CardDescription>
                        </div>
                        <Badge variant="outline" className="text-xs">
                            {todayAppointments.length} {todayAppointments.length === 1 ? "Consultation" : "Consultations"}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-4">
                    {isLoadingToday ? (
                        <div className="flex items-center justify-center p-8 text-xs text-muted-foreground gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            Loading today&apos;s consultations...
                        </div>
                    ) : todayAppointments.length === 0 ? (
                        <div className="text-center py-10 border border-dashed rounded-lg space-y-2">
                            <Calendar className="mx-auto h-8 w-8 text-muted-foreground/60" />
                            <p className="text-xs font-medium text-foreground">
                                No consultations scheduled for today
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                                You have no upcoming patient appointments today. Check your full week calendar or view your patients.
                            </p>
                            <div className="pt-2 flex justify-center gap-2">
                                <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                                    <Link href="/patients">
                                        <Users className="h-3.5 w-3.5 mr-1" />
                                        My Patients
                                    </Link>
                                </Button>
                                {user?.doctorId && (
                                    <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                                        <Link href={`/doctors/${user.doctorId}`}>
                                            <Stethoscope className="h-3.5 w-3.5 mr-1" />
                                            Clinical Schedule
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {todayAppointments.map((appt) => {
                                const patient =
                                    typeof appt.patientId === "object" && appt.patientId !== null
                                        ? (appt.patientId as Patient)
                                        : null;

                                const startTimeStr = formatDoctorTime(appt.startsAt);
                                const endTimeStr = formatDoctorTime(appt.endsAt);

                                return (
                                    <div
                                        key={appt._id}
                                        onClick={() => {
                                            setSelectedAppointment(appt);
                                            setDetailsOpen(true);
                                        }}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border bg-card hover:bg-muted/40 cursor-pointer transition-colors shadow-2xs"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="h-10 w-16 rounded-md bg-primary/10 border border-primary/20 flex flex-col items-center justify-center font-mono text-xs font-semibold text-primary shrink-0">
                                                <span>{startTimeStr}</span>
                                                <span className="text-[10px] text-muted-foreground font-normal">
                                                    {endTimeStr}
                                                </span>
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-semibold text-sm text-foreground truncate">
                                                    {patient?.name || "Patient"}
                                                </div>
                                                <div className="text-xs text-muted-foreground truncate flex items-center gap-2">
                                                    <span>{patient?.phone || "No phone"}</span>
                                                    {patient?.condition && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="truncate">{patient.condition}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                                            {getStatusBadge(appt.status)}
                                            {appt.reason && (
                                                <span className="text-xs text-muted-foreground truncate max-w-[150px] hidden md:inline">
                                                    {appt.reason}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Performance Analytics (No call to /dashboard/stats) */}
            <div className="pt-2">
                <AppointmentsDashboard initialRange="30d" />
            </div>

            {/* Appointment Details Dialog */}
            <AppointmentDetailsDialog
                appointment={selectedAppointment}
                open={detailsOpen}
                onOpenChange={setDetailsOpen}
            />
        </div>
    );
}
