"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    ArrowLeft,
    Building2,
    Calendar,
    ChevronLeft,
    ChevronRight,
    HeartPulse,
    Mail,
    Phone,
    Search,
    Stethoscope,
    Trash2,
    UserPlus,
    Users,
    Loader2,
    Edit2,
    CalendarClock,
    Clock,
    Globe,
    ArrowRight,
    History,
} from "lucide-react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { useAuth } from "@/components/providers/auth-provider";
import { qk } from "@/lib/query-keys";
import { AddPatientDialog } from "@/components/doctors/add-patient-dialog";
import { EditDoctorDialog } from "@/components/doctors/edit-doctor-dialog";
import { DeleteDoctorDialog } from "@/components/doctors/delete-doctor-dialog";
import { ScheduleEditorDialog } from "@/components/doctors/schedule-editor-dialog";
import { AppointmentDetailsDialog } from "@/components/appointments/appointment-details-dialog";
import { BookAppointmentDialog } from "@/components/appointments/book-appointment-dialog";
import { EntityHistoryDrawer } from "@/components/audit/entity-history-drawer";
import { DAY_NAMES } from "@/lib/schedule-validation";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type {
    ApiResponse,
    Appointment,
    AppointmentsResponse,
    Doctor,
    Patient,
    PatientsResponse,
} from "@/types";

export default function DoctorDetailPage() {
    const params = useParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user, can } = useAuth();
    const doctorId = params?.id as string;

    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [search, setSearch] = useState("");
    const [addPatientOpen, setAddPatientOpen] = useState(false);
    const [patientToRemove, setPatientToRemove] = useState<Patient | null>(null);

    // Permission checks
    const canAddPatient = can("patients.create", {
        targetDoctorId: doctorId,
        doctorId: user?.doctorId,
    });
    const canDeletePatient = can("patients.delete");
    const canEditProfile = can("doctors.edit_profile");
    const canDeleteDoctor = can("doctors.delete");
    const canEditSchedule = can("doctors.edit_schedule", {
        targetDoctorId: doctorId,
        doctorId: user?.doctorId,
    });
    const canViewAudit = can("audit.view");

    // Dialog states
    const [editDoctorOpen, setEditDoctorOpen] = useState(false);
    const [deleteDoctorOpen, setDeleteDoctorOpen] = useState(false);
    const [editScheduleOpen, setEditScheduleOpen] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
    const [apptDetailsOpen, setApptDetailsOpen] = useState(false);

    // Fetch upcoming appointments
    const { data: upcomingApptsData, isLoading: isLoadingUpcoming } = useQuery({
        queryKey: qk.appointments.list(`doctor_upcoming_${doctorId}`),
        queryFn: () => {
            const now = new Date();
            const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            return api.get<ApiResponse<AppointmentsResponse>>(
                `/appointments?doctorId=${doctorId}&from=${now.toISOString()}&to=${in7Days.toISOString()}&status=scheduled&limit=20`
            );
        },
        enabled: !!doctorId,
    });

    const upcomingAppointments = upcomingApptsData?.data?.appointments || [];

    // Debounce search input to avoid repeated API requests while typing
    const debouncedSearch = useDebounce(search, 400);

    // Fetch Doctor Details
    const {
        data: doctorData,
        isLoading: isDoctorLoading,
        error: doctorError,
    } = useQuery({
        queryKey: qk.doctors.detail(doctorId),
        queryFn: () =>
            api.get<ApiResponse<{ doctor: Doctor }>>(`/doctors/${doctorId}`),
        enabled: !!doctorId,
    });

    const doctor = doctorData?.data?.doctor;

    // Fetch Patients for this Doctor
    const queryParams = useMemo(() => {
        const p = new URLSearchParams();
        p.set("page", String(page));
        p.set("limit", String(limit));
        if (debouncedSearch) p.set("search", debouncedSearch);
        return p.toString();
    }, [page, limit, debouncedSearch]);

    const {
        data: patientsData,
        isLoading: isPatientsLoading,
    } = useQuery({
        queryKey: qk.doctors.patients(doctorId, queryParams),
        queryFn: () =>
            api.get<ApiResponse<PatientsResponse>>(
                `/doctors/${doctorId}/patients?${queryParams}`
            ),
        enabled: !!doctorId,
    });

    const patients = patientsData?.data?.patients || [];
    const pagination = patientsData?.data?.pagination;

    // Mutation: Delete patient from doctor's list
    const deletePatientMutation = useMutation({
        mutationFn: (patientId: string) =>
            api.delete(`/doctors/${doctorId}/patients/${patientId}`),
        onSuccess: () => {
            toast.success("Patient removed successfully");
            queryClient.invalidateQueries({
                queryKey: qk.doctors.patients(doctorId),
            });
            queryClient.invalidateQueries({ queryKey: qk.patients.all() });
            queryClient.invalidateQueries({ queryKey: qk.dashboard.stats() });
            setPatientToRemove(null);
        },
        onError: (error: unknown) => {
            const message =
                error instanceof ApiError
                    ? error.message
                    : "Failed to remove patient";
            toast.error("Error", { description: message });
            setPatientToRemove(null);
        },
    });

    return (
        <>
            <div className="space-y-6 min-w-0 max-w-full">
                {/* Back button and breadcrumb navigation */}
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                        <Link href="/doctors">
                            <ArrowLeft className="h-4 w-4" />
                            Back to Doctors
                        </Link>
                    </Button>
                </div>

                {/* Top Section: Doctor Details */}
                {isDoctorLoading ? (
                    <Card>
                        <CardContent className="p-6 space-y-4">
                            <div className="flex items-center gap-4">
                                <Skeleton className="h-16 w-16 rounded-full" />
                                <div className="space-y-2">
                                    <Skeleton className="h-6 w-48" />
                                    <Skeleton className="h-4 w-32" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        </CardContent>
                    </Card>
                ) : doctorError || !doctor ? (
                    <Card className="border-destructive/30">
                        <CardContent className="p-8 text-center space-y-3">
                            <Stethoscope className="mx-auto h-10 w-10 text-destructive" />
                            <h3 className="text-lg font-semibold text-destructive">
                                Doctor Not Found
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Could not load information for this doctor. The record may have been deleted or the ID is invalid.
                            </p>
                            <Button
                                variant="outline"
                                onClick={() => router.push("/doctors")}
                                className="mt-2"
                            >
                                Return to Doctors List
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        <Card className="overflow-hidden border bg-card shadow-xs">
                        <div className="bg-primary/5 border-b px-6 py-5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold text-2xl shadow-xs">
                                        {doctor.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                                {doctor.name}
                                            </h1>
                                            <Badge variant="secondary" className="font-medium text-xs">
                                                {doctor.specialization}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                                            <Building2 className="h-3.5 w-3.5" />
                                            {doctor.hospital}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="bg-background/80 border rounded-lg px-4 py-2 text-right">
                                        <div className="text-xs text-muted-foreground">Assigned Patients</div>
                                        <div className="text-xl font-bold text-primary flex items-center justify-end gap-1.5">
                                            <Users className="h-4 w-4" />
                                            {pagination?.totalPatients ?? patients.length}
                                        </div>
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5">
                                        {canEditProfile && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setEditDoctorOpen(true)}
                                                className="h-8 gap-1.5 text-xs shadow-xs"
                                            >
                                                <Edit2 className="h-3.5 w-3.5" />
                                                Edit Profile
                                            </Button>
                                        )}
                                        {canEditSchedule && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setEditScheduleOpen(true)}
                                                className="h-8 gap-1.5 text-xs shadow-xs"
                                            >
                                                <CalendarClock className="h-3.5 w-3.5 text-primary" />
                                                Edit Schedule
                                            </Button>
                                        )}
                                        {canDeleteDoctor && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setDeleteDoctorOpen(true)}
                                                className="h-8 gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                                Delete
                                            </Button>
                                        )}
                                        {canViewAudit && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setHistoryOpen(true)}
                                                className="h-8 gap-1.5 text-xs shadow-xs"
                                            >
                                                <History className="h-3.5 w-3.5 text-muted-foreground" />
                                                History
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                                    <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                                        <Phone className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <div className="text-xs text-muted-foreground">Phone Number</div>
                                        <div className="text-sm font-medium font-mono">
                                            {doctor.phone}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                                    <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                                        <Mail className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-xs text-muted-foreground">Email Address</div>
                                        <div className="text-sm font-medium truncate" title={doctor.email}>
                                            {doctor.email}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                                    <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                                        <Building2 className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-xs text-muted-foreground">Hospital</div>
                                        <div className="text-sm font-medium truncate" title={doctor.hospital}>
                                            {doctor.hospital}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                                    <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                                        <Calendar className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <div className="text-xs text-muted-foreground">Joined Date</div>
                                        <div className="text-sm font-medium">
                                            {new Date(doctor.createdAt).toLocaleDateString(undefined, {
                                                year: "numeric",
                                                month: "short",
                                                day: "numeric",
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Weekly Schedule Summary Card */}
                    <Card className="min-w-0 max-w-full">
                        <CardHeader className="pb-3 border-b">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                                        <CalendarClock className="h-4 w-4 text-primary" />
                                        Weekly Clinical Schedule
                                    </CardTitle>
                                    <CardDescription className="text-xs mt-0.5">
                                        Working shifts and availability intervals in the practitioner&apos;s timezone.
                                    </CardDescription>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="outline" className="text-xs gap-1 font-normal">
                                        <Globe className="h-3 w-3 text-muted-foreground" />
                                        {doctor.timezone || "Asia/Dhaka"}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs gap-1 font-normal">
                                        <Clock className="h-3 w-3 text-muted-foreground" />
                                        {doctor.slotMinutes || 30} min slots
                                    </Badge>
                                    {canEditSchedule && (
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => setEditScheduleOpen(true)}
                                            className="h-7 text-xs gap-1"
                                        >
                                            <CalendarClock className="h-3.5 w-3.5" />
                                            Configure
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 sm:p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                                {DAY_NAMES.map((dayName, dayIndex) => {
                                    const dayShifts = (doctor.workingHours || []).filter(
                                        (s) => s.dayOfWeek === dayIndex
                                    );
                                    return (
                                        <div
                                            key={dayName}
                                            className={`rounded-lg border p-3 text-xs flex flex-col justify-between min-h-[90px] ${
                                                dayShifts.length > 0
                                                    ? "bg-card border-border shadow-2xs"
                                                    : "bg-muted/30 border-dashed text-muted-foreground"
                                            }`}
                                        >
                                            <div className="font-semibold text-foreground border-b pb-1 mb-1.5 flex items-center justify-between">
                                                <span>{dayName}</span>
                                                {dayShifts.length > 0 ? (
                                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                ) : null}
                                            </div>
                                            <div className="space-y-1">
                                                {dayShifts.length === 0 ? (
                                                    <span className="text-[11px] italic text-muted-foreground">
                                                        Day Off
                                                    </span>
                                                ) : (
                                                    dayShifts.map((shift, i) => (
                                                        <div
                                                            key={i}
                                                            className="font-mono text-[11px] bg-primary/5 text-primary px-1.5 py-0.5 rounded font-medium text-center"
                                                        >
                                                            {shift.start} - {shift.end}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Upcoming Consultations Card (Next 7 Days) */}
                    <Card className="min-w-0 max-w-full">
                        <CardHeader className="pb-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-primary" />
                                    Upcoming Consultations (Next 7 Days)
                                </CardTitle>
                                <CardDescription className="text-xs mt-0.5">
                                    Confirmed consultations scheduled with Dr. {doctor.name}.
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <BookAppointmentDialog initialDoctorId={doctorId} />
                                <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1">
                                    <Link href={`/appointments?doctorId=${doctorId}&view=week`}>
                                        Calendar View
                                        <ArrowRight className="h-3.5 w-3.5" />
                                    </Link>
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 sm:p-6">
                            {isLoadingUpcoming ? (
                                <div className="flex items-center justify-center p-6 text-xs text-muted-foreground gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                    Loading upcoming consultations...
                                </div>
                            ) : upcomingAppointments.length === 0 ? (
                                <div className="text-center py-6 border border-dashed rounded-lg text-xs text-muted-foreground">
                                    No consultations scheduled for Dr. {doctor.name} in the next 7 days.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {upcomingAppointments.map((appt) => {
                                        const p =
                                            typeof appt.patientId === "object" && appt.patientId !== null
                                                ? (appt.patientId as Patient)
                                                : null;
                                        return (
                                            <div
                                                key={appt._id}
                                                onClick={() => {
                                                    setSelectedAppt(appt);
                                                    setApptDetailsOpen(true);
                                                }}
                                                className="p-3 rounded-lg border bg-card hover:bg-muted/40 cursor-pointer transition-colors shadow-2xs space-y-1"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-semibold text-xs text-foreground truncate">
                                                        {p?.name || "Patient"}
                                                    </span>
                                                    <span className="text-[10px] font-mono bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded">
                                                        {format(new Date(appt.startsAt), "MMM d, HH:mm")}
                                                    </span>
                                                </div>
                                                <div className="text-[11px] text-muted-foreground truncate">
                                                    {p?.phone || p?.condition || "Consultation"}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
                )}

                {/* Bottom Section: Patients List & Add Patient Button */}
                <Card className="min-w-0 max-w-full overflow-hidden">
                    <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                    <HeartPulse className="h-5 w-5 text-primary" />
                                    Patients List
                                </CardTitle>
                                {pagination?.totalPatients !== undefined && (
                                    <Badge variant="outline" className="text-xs">
                                        {pagination.totalPatients} {pagination.totalPatients === 1 ? "Patient" : "Patients"}
                                    </Badge>
                                )}
                            </div>
                            <CardDescription className="text-xs mt-1">
                                {doctor ? `Patients currently under Dr. ${doctor.name}'s care` : "Patients under this doctor"}
                            </CardDescription>
                        </div>

                        {/* Actions above the patients list: Search & Add Patient Button */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search patients..."
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        setPage(1);
                                    }}
                                    className="pl-9 h-9 text-xs"
                                />
                            </div>

                            {canAddPatient && (
                                <Button
                                    onClick={() => setAddPatientOpen(true)}
                                    disabled={!doctor}
                                    className="gap-2 h-9 text-xs shadow-xs"
                                >
                                    <UserPlus className="h-4 w-4" />
                                    Add Patient
                                </Button>
                            )}
                        </div>
                    </CardHeader>

                    <CardContent className="p-0 min-w-0 max-w-full">
                        {isPatientsLoading ? (
                            <div className="p-6 space-y-3">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        ) : patients.length === 0 ? (
                            <div className="text-center py-16 px-4">
                                <Users className="mx-auto h-10 w-10 text-muted-foreground/60" />
                                <h3 className="mt-2 text-base font-semibold">
                                    No patients assigned
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                                    {search
                                        ? "No patients match your search term. Try a different query."
                                        : doctor
                                        ? `Dr. ${doctor.name} currently has no patients assigned.`
                                        : "No patients found for this doctor."}
                                </p>
                                {canAddPatient && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setAddPatientOpen(true)}
                                        className="mt-4 gap-1.5 text-xs"
                                    >
                                        <UserPlus className="h-3.5 w-3.5" />
                                        Add Patient
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <Table className="min-w-[750px]">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Patient Name</TableHead>
                                        <TableHead>Condition / Diagnosis</TableHead>
                                        <TableHead>Demographics</TableHead>
                                        <TableHead>Contact</TableHead>
                                        <TableHead>Registered</TableHead>
                                        {canDeletePatient && (
                                            <TableHead className="text-right">Actions</TableHead>
                                        )}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {patients.map((patient: Patient) => (
                                        <TableRow key={patient._id}>
                                            <TableCell>
                                                <Link
                                                    href={`/patients/${patient._id}`}
                                                    className="font-medium text-foreground hover:text-primary hover:underline"
                                                >
                                                    {patient.name}
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="info" className="font-normal text-xs">
                                                    {patient.condition}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-xs text-muted-foreground capitalize">
                                                    {patient.gender}, {patient.age} yrs
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-0.5 text-xs">
                                                    <div className="flex items-center gap-1 font-mono text-[11px]">
                                                        <Phone className="h-3 w-3 text-muted-foreground" />
                                                        {patient.phone}
                                                    </div>
                                                    {patient.email && (
                                                        <div className="flex items-center gap-1 text-muted-foreground text-[11px] truncate max-w-[180px]">
                                                            <Mail className="h-3 w-3" />
                                                            {patient.email}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(patient.createdAt).toLocaleDateString(undefined, {
                                                        year: "numeric",
                                                        month: "short",
                                                        day: "numeric",
                                                    })}
                                                </span>
                                            </TableCell>
                                            {canDeletePatient && (
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                        disabled={
                                                            deletePatientMutation.isPending &&
                                                            patientToRemove?._id === patient._id
                                                        }
                                                        onClick={() => setPatientToRemove(patient)}
                                                        title="Remove patient from doctor's list"
                                                    >
                                                        {deletePatientMutation.isPending &&
                                                        patientToRemove?._id === patient._id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}

                        {/* Pagination Bar */}
                        {pagination && pagination.totalPages > 1 && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t">
                                <div className="text-xs text-muted-foreground">
                                    Showing page{" "}
                                    <span className="font-semibold text-foreground">
                                        {pagination.currentPage}
                                    </span>{" "}
                                    of{" "}
                                    <span className="font-semibold text-foreground">
                                        {pagination.totalPages}
                                    </span>{" "}
                                    ({pagination.totalPatients ?? 0} total)
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 gap-1 text-xs"
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        disabled={!pagination.hasPreviousPage}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 gap-1 text-xs"
                                        onClick={() =>
                                            setPage((p) =>
                                                Math.min(pagination.totalPages, p + 1)
                                            )
                                        }
                                        disabled={!pagination.hasNextPage}
                                    >
                                        Next
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Modal to Add New Patient */}
            {doctor && (
                <AddPatientDialog
                    doctorId={doctorId}
                    doctorName={doctor.name}
                    open={addPatientOpen}
                    onOpenChange={setAddPatientOpen}
                />
            )}

            {/* Remove Patient Confirmation Alert Dialog */}
            <AlertDialog
                open={!!patientToRemove}
                onOpenChange={(open) => {
                    if (!open) setPatientToRemove(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Patient from Doctor</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove patient{" "}
                            <span className="font-semibold text-foreground">
                                {patientToRemove?.name}
                            </span>{" "}
                            from Dr. {doctor?.name || "this doctor"}&apos;s roster?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deletePatientMutation.isPending}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                if (patientToRemove) {
                                    deletePatientMutation.mutate(patientToRemove._id);
                                }
                            }}
                            disabled={deletePatientMutation.isPending}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deletePatientMutation.isPending ? "Removing..." : "Remove Patient"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Edit Doctor Profile Dialog */}
            <EditDoctorDialog
                doctor={doctor || null}
                open={editDoctorOpen}
                onOpenChange={setEditDoctorOpen}
            />

            {/* Delete Doctor Dialog with Patient Reassignment */}
            <DeleteDoctorDialog
                doctor={doctor || null}
                open={deleteDoctorOpen}
                onOpenChange={setDeleteDoctorOpen}
                onDeleted={() => router.push("/doctors")}
                initialPatientCount={pagination?.totalPatients ?? patients.length}
            />

            {/* Schedule Editor Dialog */}
            {doctor && (
                <ScheduleEditorDialog
                    doctorId={doctorId}
                    doctorName={doctor.name}
                    initialTimezone={doctor.timezone}
                    initialSlotMinutes={doctor.slotMinutes}
                    initialWorkingHours={doctor.workingHours}
                    open={editScheduleOpen}
                    onOpenChange={setEditScheduleOpen}
                />
            )}
            {/* Appointment Details Dialog */}
            <AppointmentDetailsDialog
                appointment={selectedAppt}
                open={apptDetailsOpen}
                onOpenChange={setApptDetailsOpen}
            />

            {/* Entity Audit History Drawer (Admin Only) */}
            {doctor && (
                <EntityHistoryDrawer
                    entityType="Doctor"
                    entityId={doctorId}
                    entityName={doctor.name}
                    open={historyOpen}
                    onOpenChange={setHistoryOpen}
                />
            )}
        </>
    );
}

