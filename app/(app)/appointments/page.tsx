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
    Search,
    RotateCcw,
} from "lucide-react";

import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { useDebounce } from "@/lib/hooks/use-debounce";
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

    // URL parameter parsing
    const urlView = (searchParams.get("view") as "week" | "day" | "list") || "week";
    const urlDate = searchParams.get("date") || format(new Date(), "yyyy-MM-dd");
    const urlDoctorId = searchParams.get("doctorId") || (isDoctorUser ? user.doctorId! : "");
    const urlStatus = (searchParams.get("status") as AppointmentStatus | "all") || "all";

    const [view, setView] = useState<"week" | "day" | "list">(urlView);
    const [selectedDateStr, setSelectedDateStr] = useState<string>(urlDate);
    const [selectedDoctorId, setSelectedDoctorId] = useState<string>(urlDoctorId);
    const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "all">(urlStatus);
    const [searchInput, setSearchInput] = useState<string>("");
    const [page, setPage] = useState<number>(1);

    const debouncedSearch = useDebounce(searchInput, 400);

    const selectedDate = useMemo(() => {
        try {
            const [y, m, d] = selectedDateStr.split("-").map(Number);
            return new Date(y, m - 1, d);
        } catch {
            return new Date();
        }
    }, [selectedDateStr]);

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

    // Sync state back to URL query parameters
    const effectiveDoctorId =
        selectedDoctorId ||
        (isDoctorUser ? user?.doctorId : undefined) ||
        (doctors[0]?._id) ||
        "";

    useEffect(() => {
        const params = new URLSearchParams();
        params.set("view", view);
        params.set("date", selectedDateStr);
        if (effectiveDoctorId) params.set("doctorId", effectiveDoctorId);
        if (statusFilter !== "all") params.set("status", statusFilter);

        router.replace(`${pathname}?${params.toString()}`);
    }, [view, selectedDateStr, effectiveDoctorId, statusFilter, pathname, router]);

    const activeDoctor = isDoctorUser
        ? doctors.find((d) => d._id === user?.doctorId)
        : doctors.find((d) => d._id === effectiveDoctorId);

    // Date range calculations for Calendar view
    const dateRange = useMemo(() => {
        if (view === "day") {
            return {
                from: startOfDay(selectedDate).toISOString(),
                to: endOfDay(selectedDate).toISOString(),
            };
        }
        // Week view
        const wStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
        const wEnd = endOfWeek(selectedDate, { weekStartsOn: 0 });
        return {
            from: wStart.toISOString(),
            to: wEnd.toISOString(),
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
        enabled: (view === "week" || view === "day") && !!effectiveDoctorId,
    });

    // Query for List view (Paginated)
    const listQueryParam = useMemo(() => {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", "10");
        if (effectiveDoctorId) params.set("doctorId", effectiveDoctorId);
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (debouncedSearch) params.set("search", debouncedSearch);
        return params.toString();
    }, [page, effectiveDoctorId, statusFilter, debouncedSearch]);

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
        setSelectedDateStr(format(new Date(), "yyyy-MM-dd"));
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

                {/* Filters Row: Doctor, Status, Search */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t">
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
                                value={selectedDoctorId}
                                onValueChange={(id) => {
                                    setSelectedDoctorId(id);
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

                    {/* Search (primarily for List view) */}
                    {view === "list" && (
                        <div className="space-y-1 sm:col-span-2">
                            <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                                <Search className="h-3 w-3 text-primary" />
                                Search Patient or Notes
                            </label>
                            <div className="relative">
                                <Input
                                    placeholder="Search by patient name, phone, condition..."
                                    value={searchInput}
                                    onChange={(e) => {
                                        setSearchInput(e.target.value);
                                        setPage(1);
                                    }}
                                    className="h-8 text-xs pr-8"
                                />
                                {searchInput && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchInput("")}
                                        className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                                    >
                                        <RotateCcw className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
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
            ) : !selectedDoctorId ? (
                <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
                    Please select a practitioner above to view their consultation calendar.
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
