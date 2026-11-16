"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
    format,
    addDays,
    subDays,
    addWeeks,
    subWeeks,
    startOfWeek,
    endOfWeek,
    startOfDay,
    endOfDay,
} from "date-fns";
import { TZDate } from "@date-fns/tz";
import { useQuery } from "@tanstack/react-query";
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Stethoscope,
    Filter,
    List,
    CalendarDays,
    Clock,
} from "lucide-react";

import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { useAuth } from "@/components/providers/auth-provider";
import { RequireRole } from "@/components/auth/require-role";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppointmentsCalendar } from "@/components/appointments/appointments-calendar";
import { AppointmentsListTable } from "@/components/appointments/appointments-list-table";
import { BookAppointmentDialog } from "@/components/appointments/book-appointment-dialog";
import { AppointmentDetailsDialog } from "@/components/appointments/appointment-details-dialog";
import type {
    ApiResponse,
    Appointment,
    AppointmentsResponse,
    AppointmentStatus,
    Doctor,
} from "@/types";

export default function AppointmentsPage() {
    return (
        <RequireRole action="appointments.list">
            <AppointmentsContent />
        </RequireRole>
    );
}

function AppointmentsContent() {
    const { user, role } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const isDoctorUser = role === "doctor" && !!user?.doctorId;
    const canBook = role === "admin" || role === "staff" || role === "doctor";

    // URL parameter parsing (validate view param against "week" | "day" | "list")
    const searchParamDate = searchParams.get("date");
    const rawView = searchParams.get("view");
    const urlView: "week" | "day" | "list" =
        rawView === "day" || rawView === "list" ? rawView : "week";
    const urlDoctorId = isDoctorUser ? user.doctorId! : (searchParams.get("doctorId") || "");
    const urlStatus = (searchParams.get("status") as AppointmentStatus | "all") || "all";

    const [view, setView] = useState<"week" | "day" | "list">(urlView);
    const [selectedDoctorId, setSelectedDoctorId] = useState<string>(urlDoctorId);
    const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "all">(urlStatus);
    const [page, setPage] = useState<number>(1);

    // Active dialog state
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);

    // Fetch doctors list for filter dropdown
    const { data: doctorsData, isLoading: isLoadingDoctors } = useQuery({
        queryKey: qk.doctors.list("limit=100"),
        queryFn: () =>
            api.get<ApiResponse<{ doctors: Doctor[] }>>("/doctors?limit=100"),
    });

    const doctors = doctorsData?.data?.doctors || [];

    // Single doctor selection rule: locked for doctor role, user-selected for others, NO silent fallback to doctors[0]
    const effectiveDoctorId = isDoctorUser ? user.doctorId! : selectedDoctorId;

    const activeDoctor = effectiveDoctorId
        ? doctors.find((d) => d._id === effectiveDoctorId)
        : null;
    const doctorTimezone = activeDoctor?.timezone || "UTC";

    const getTodayInDoctorTz = (tz: string) => {
        try {
            return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
        } catch {
            return format(new Date(), "yyyy-MM-dd");
        }
    };

    const initialDateDefault = useMemo(() => {
        if (searchParamDate) return searchParamDate;
        return activeDoctor?.timezone
            ? getTodayInDoctorTz(activeDoctor.timezone)
            : format(new Date(), "yyyy-MM-dd");
    }, [searchParamDate, activeDoctor?.timezone]);

    const [selectedDateStr, setSelectedDateStr] = useState<string>(initialDateDefault);

    // If no explicit ?date was specified in URL, update default to today in active doctor's timezone once known
    const [syncedDocTz, setSyncedDocTz] = useState<string | null>(null);
    if (!searchParamDate && activeDoctor?.timezone && syncedDocTz !== activeDoctor.timezone) {
        setSyncedDocTz(activeDoctor.timezone);
        setSelectedDateStr(getTodayInDoctorTz(activeDoctor.timezone));
    }

    useEffect(() => {
        const params = new URLSearchParams();
        params.set("view", view);
        params.set("date", selectedDateStr);
        if (effectiveDoctorId) params.set("doctorId", effectiveDoctorId);
        if (statusFilter !== "all") params.set("status", statusFilter);

        router.replace(`${pathname}?${params.toString()}`);
    }, [view, selectedDateStr, effectiveDoctorId, statusFilter, pathname, router]);

    const selectedDate = useMemo(() => {
        try {
            const [y, m, d] = selectedDateStr.split("-").map(Number);
            return new TZDate(y, m - 1, d, doctorTimezone);
        } catch {
            return new TZDate(new Date(), doctorTimezone);
        }
    }, [selectedDateStr, doctorTimezone]);

    // Date range calculations for Calendar view computed in doctor's timezone
    const dateRange = useMemo(() => {
        if (view === "day") {
            const s = startOfDay(selectedDate);
            const e = endOfDay(selectedDate);
            return {
                from: new Date(s.getTime()).toISOString(),
                to: new Date(e.getTime()).toISOString(),
            };
        }
        // Week view
        const wStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
        const wEnd = endOfWeek(selectedDate, { weekStartsOn: 0 });
        return {
            from: new Date(wStart.getTime()).toISOString(),
            to: new Date(wEnd.getTime()).toISOString(),
        };
    }, [view, selectedDate]);

    // Query for Calendar views (Week & Day)
    const calendarQueryParam = useMemo(() => {
        const params = new URLSearchParams();
        if (effectiveDoctorId) params.set("doctorId", effectiveDoctorId);
        params.set("from", dateRange.from);
        params.set("to", dateRange.to);
        params.set("limit", "200");
        if (statusFilter !== "all") params.set("status", statusFilter);
        return params.toString();
    }, [effectiveDoctorId, dateRange, statusFilter]);

    const { data: calendarData } = useQuery({
        queryKey: qk.appointments.list(`cal_${calendarQueryParam}`),
        queryFn: () =>
            api.get<ApiResponse<AppointmentsResponse>>(
                `/appointments?${calendarQueryParam}`
            ),
        enabled: (view === "week" || view === "day") && !!effectiveDoctorId && !!activeDoctor,
    });

    // Query for List view (Paginated, supports all or specific doctor, NO search param)
    const listQueryParam = useMemo(() => {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", "10");
        if (effectiveDoctorId) params.set("doctorId", effectiveDoctorId);
        if (statusFilter !== "all") params.set("status", statusFilter);
        return params.toString();
    }, [page, effectiveDoctorId, statusFilter]);

    const { data: listData, isLoading: isLoadingList } = useQuery({
        queryKey: qk.appointments.list(`table_${listQueryParam}`),
        queryFn: () =>
            api.get<ApiResponse<AppointmentsResponse>>(
                `/appointments?${listQueryParam}`
            ),
        enabled: view === "list",
    });

    const calendarAppointments = calendarData?.data?.appointments || [];
    const listAppointments = listData?.data?.appointments || [];
    const listPagination = listData?.data?.pagination;

    // Date Navigation helpers
    const handlePrev = () => {
        if (view === "week") {
            setSelectedDateStr(format(subWeeks(selectedDate, 1), "yyyy-MM-dd"));
        } else {
            setSelectedDateStr(format(subDays(selectedDate, 1), "yyyy-MM-dd"));
        }
    };

    const handleNext = () => {
        if (view === "week") {
            setSelectedDateStr(format(addWeeks(selectedDate, 1), "yyyy-MM-dd"));
        } else {
            setSelectedDateStr(format(addDays(selectedDate, 1), "yyyy-MM-dd"));
        }
    };

    const handleToday = () => {
        try {
            const todayInTz = new Intl.DateTimeFormat("en-CA", {
                timeZone: doctorTimezone,
            }).format(new Date());
            setSelectedDateStr(todayInTz);
        } catch {
            setSelectedDateStr(format(new Date(), "yyyy-MM-dd"));
        }
    };

    const handleOpenDetails = (appointment: Appointment) => {
        setSelectedAppointment(appointment);
        setDetailsOpen(true);
    };

    return (
        <div className="space-y-5">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <CalendarIcon className="h-6 w-6 text-primary" />
                        Appointments
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Clinical scheduling, practitioner slot availability, and patient consultation calendar.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {canBook && (
                        <BookAppointmentDialog initialDoctorId={selectedDoctorId} />
                    )}
                </div>
            </div>

            {/* Filter and View Controls Toolbar */}
            <div className="rounded-lg border bg-card p-4 space-y-3 shadow-xs">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    {/* View Selector Tabs */}
                    <Tabs
                        value={view}
                        onValueChange={(v) => setView(v as "week" | "day" | "list")}
                        className="w-auto"
                    >
                        <TabsList className="grid grid-cols-3 w-[260px]">
                            <TabsTrigger value="week" className="text-xs gap-1">
                                <CalendarDays className="h-3.5 w-3.5" />
                                Week
                            </TabsTrigger>
                            <TabsTrigger value="day" className="text-xs gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                Day
                            </TabsTrigger>
                            <TabsTrigger value="list" className="text-xs gap-1">
                                <List className="h-3.5 w-3.5" />
                                List
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {/* Date Navigation Controls */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePrev}
                            className="h-8 w-8 p-0"
                            title="Previous period"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleToday}
                            className="h-8 text-xs font-medium px-2.5"
                        >
                            Today
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleNext}
                            className="h-8 w-8 p-0"
                            title="Next period"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>

                        <Input
                            type="date"
                            value={selectedDateStr}
                            onChange={(e) => setSelectedDateStr(e.target.value)}
                            className="h-8 text-xs w-[140px]"
                        />

                        {view === "week" && (
                            <span className="text-xs text-muted-foreground ml-1 hidden sm:inline">
                                Week of {format(startOfWeek(selectedDate, { weekStartsOn: 0 }), "MMM d")} –{" "}
                                {format(endOfWeek(selectedDate, { weekStartsOn: 0 }), "MMM d, yyyy")}
                            </span>
                        )}
                        {view === "day" && (
                            <span className="text-xs text-muted-foreground ml-1 hidden sm:inline">
                                {format(selectedDate, "EEEE, MMMM d, yyyy")}
                            </span>
                        )}
                    </div>
                </div>

                {/* Filters Row: Doctor and Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t">
                    {/* Doctor Selector */}
                    <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                            <Stethoscope className="h-3 w-3 text-primary" />
                            Practitioner
                        </label>
                        {isDoctorUser ? (
                            <div className="h-8 px-2.5 rounded-md border bg-muted/40 text-xs flex items-center font-medium">
                                {user?.name} (Your Roster)
                            </div>
                        ) : (
                            <Select
                                value={selectedDoctorId || (view === "list" ? "all" : "")}
                                onValueChange={(id) => {
                                    setSelectedDoctorId(id === "all" ? "" : id);
                                    setPage(1);
                                }}
                                disabled={isLoadingDoctors}
                            >
                                <SelectTrigger className="h-8 text-xs">
                                    <SelectValue
                                        placeholder={
                                            isLoadingDoctors
                                                ? "Loading doctors..."
                                                : "Select doctor"
                                        }
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {view === "list" && (
                                        <SelectItem value="all" className="text-xs">
                                            All Practitioners
                                        </SelectItem>
                                    )}
                                    {doctors.map((d) => (
                                        <SelectItem key={d._id} value={d._id} className="text-xs">
                                            {d.name} — {d.specialization}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>

                    {/* Status Filter */}
                    <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                            <Filter className="h-3 w-3 text-primary" />
                            Status
                        </label>
                        <Select
                            value={statusFilter}
                            onValueChange={(val) => {
                                setStatusFilter(val as AppointmentStatus | "all");
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all" className="text-xs">
                                    All Statuses
                                </SelectItem>
                                <SelectItem value="scheduled" className="text-xs">
                                    Scheduled
                                </SelectItem>
                                <SelectItem value="completed" className="text-xs">
                                    Completed
                                </SelectItem>
                                <SelectItem value="cancelled" className="text-xs">
                                    Cancelled
                                </SelectItem>
                                <SelectItem value="no_show" className="text-xs">
                                    No-Show
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Active View Content */}
            {view === "list" ? (
                <AppointmentsListTable
                    appointments={listAppointments}
                    pagination={listPagination}
                    page={page}
                    setPage={setPage}
                    isLoading={isLoadingList}
                    onSelectAppointment={handleOpenDetails}
                />
            ) : !effectiveDoctorId ? (
                <div className="rounded-lg border border-dashed p-12 text-center flex flex-col items-center justify-center bg-card">
                    <Stethoscope className="h-10 w-10 text-muted-foreground/60 mb-3" />
                    <h3 className="font-semibold text-base text-foreground">Select a Practitioner</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mt-1">
                        Please select a doctor above to view their weekly schedule, clinical working hours, and booked appointments.
                    </p>
                </div>
            ) : (
                <AppointmentsCalendar
                    appointments={calendarAppointments}
                    doctor={activeDoctor || null}
                    view={view}
                    selectedDate={selectedDate}
                    onSelectAppointment={handleOpenDetails}
                />
            )}

            {/* Appointment Details Drawer */}
            <AppointmentDetailsDialog
                appointment={selectedAppointment}
                open={detailsOpen}
                onOpenChange={setDetailsOpen}
            />
        </div>
    );
}
