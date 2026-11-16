"use client";

import { Suspense, useState } from "react";
import { useParams, useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { TZDate } from "@date-fns/tz";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    ArrowLeft,
    Calendar,
    HeartPulse,
    Mail,
    Phone,
    ShieldAlert,
    Stethoscope,
    Trash2,
    User,
    Users,
    Edit2,
    CalendarPlus,
    Plus,
    ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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
import { EditPatientDialog } from "@/components/patients/edit-patient-dialog";
import { BookAppointmentDialog } from "@/components/appointments/book-appointment-dialog";
import { AppointmentDetailsDialog } from "@/components/appointments/appointment-details-dialog";
import { RecordVisitDialog } from "@/components/visits/record-visit-dialog";
import { VisitsTimeline } from "@/components/visits/visits-timeline";
import type {
    ApiResponse,
    Appointment,
    AppointmentsResponse,
    Doctor,
    Patient,
} from "@/types";

function PatientDetailContent() {
    const params = useParams();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();
    const { user, can } = useAuth();

    const patientId = typeof params.id === "string" ? params.id : "";

    // Active tab in URL (?tab=overview|appointments|visits)
    const rawTab = searchParams.get("tab") || "overview";
    const activeTab = ["overview", "appointments", "visits"].includes(rawTab)
        ? rawTab
        : "overview";

    // Dialog state
    const [editPatientOpen, setEditPatientOpen] = useState(false);
    const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
    const [bookAppointmentOpen, setBookAppointmentOpen] = useState(false);
    const [recordVisitOpen, setRecordVisitOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [appointmentDetailsOpen, setAppointmentDetailsOpen] = useState(false);

    // Fetch patient detail
    const {
        data: patientResponse,
        isLoading: isPatientLoading,
        isError: isPatientError,
    } = useQuery({
        queryKey: qk.patients.detail(patientId),
        queryFn: () =>
            api.get<ApiResponse<{ patient: Patient }>>(`/patients/${patientId}`),
        enabled: !!patientId,
    });

    const patient = patientResponse?.data?.patient;

    // Doctor information extraction
    const assignedDoctor =
        patient && typeof patient.doctorId === "object"
            ? (patient.doctorId as Doctor)
            : null;
    const assignedDoctorId =
        assignedDoctor?._id ||
        (typeof patient?.doctorId === "string" ? patient.doctorId : "");
    const doctorTimezone = assignedDoctor?.timezone || "Asia/Dhaka";

    // Permissions
    const canEditPatient = can("patients.edit", {
        targetDoctorId: assignedDoctorId,
        doctorId: user?.doctorId,
    });
    const canDeletePatient = can("patients.delete");
    const canBookAppointment = can("appointments.book", {
        targetDoctorId: assignedDoctorId,
        doctorId: user?.doctorId,
    });

    // Visits permission: ONLY admin and treating doctor
    const canReadVisits = can("visits.read", {
        targetDoctorId: assignedDoctorId,
        doctorId: user?.doctorId,
    });
    const canCreateVisit = can("visits.create", {
        targetDoctorId: assignedDoctorId,
        doctorId: user?.doctorId,
    });

    // Fetch Appointments for this patient
    const {
        data: appointmentsResponse,
        isLoading: isAppointmentsLoading,
    } = useQuery({
        queryKey: qk.appointments.list(`patientId=${patientId}`),
        queryFn: () =>
            api.get<ApiResponse<AppointmentsResponse>>(
                `/appointments?patientId=${patientId}&limit=50`
            ),
        enabled: !!patientId && !isPatientError,
    });

    const appointments: Appointment[] =
        appointmentsResponse?.data?.appointments || [];

    // Delete patient mutation
    const deleteMutation = useMutation({
        mutationFn: () => api.delete(`/patients/${patientId}`),
        onSuccess: () => {
            toast.success("Patient deleted", {
                description: "The patient record has been removed.",
            });
            queryClient.invalidateQueries({ queryKey: qk.patients.all() });
            queryClient.invalidateQueries({ queryKey: qk.appointments.all() });
            router.push("/patients");
        },
        onError: (err: unknown) => {
            if (err instanceof ApiError) {
                toast.error("Failed to delete patient", { description: err.message });
            } else {
                toast.error("Failed to delete patient", {
                    description: "An unexpected error occurred.",
                });
            }
        },
    });

    const handleTabChange = (val: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", val);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    // Format helper in doctor timezone
    const formatInDoctorTz = (dateStr?: string | null, pattern = "MMM d, yyyy h:mm a") => {
        if (!dateStr) return "";
        try {
            return format(new TZDate(new Date(dateStr), doctorTimezone), pattern);
        } catch {
            return format(new Date(dateStr), pattern);
        }
    };

    // 1. Loading State
    if (isPatientLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-64" />
                </div>
                <Card className="p-6">
                    <div className="space-y-4">
                        <Skeleton className="h-6 w-48" />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                        </div>
                    </div>
                </Card>
            </div>
        );
    }

    // 2. 404 / Scoped Resource Access Denied handling: clean "Patient Not Found"
    if (isPatientError || !patient) {
        return (
            <div className="space-y-6">
                <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="gap-2 text-muted-foreground hover:text-foreground"
                >
                    <Link href="/patients">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Patients
                    </Link>
                </Button>

                <Card className="border-muted p-12 text-center max-w-lg mx-auto">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground/60" />
                    <h2 className="mt-4 text-lg font-semibold">Patient Not Found</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                        The requested patient record could not be found or has been removed.
                    </p>
                    <Button asChild className="mt-6 text-xs" size="sm">
                        <Link href="/patients">View Patients List</Link>
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header / Breadcrumb navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                        <Link href="/patients" aria-label="Back to patients">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                                {patient.name}
                            </h1>
                            <Badge variant="outline" className="capitalize text-xs">
                                {patient.gender}, {patient.age} yrs
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Patient Record #{patient._id.substring(patient._id.length - 6).toUpperCase()}
                        </p>
                    </div>
                </div>

                {/* Patient actions */}
                <div className="flex items-center gap-2 flex-wrap">
                    {canEditPatient && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditPatientOpen(true)}
                            className="gap-1.5 text-xs h-8"
                        >
                            <Edit2 className="h-3.5 w-3.5" />
                            Edit Patient
                        </Button>
                    )}
                    {canDeletePatient && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteAlertOpen(true)}
                            className="gap-1.5 text-xs h-8 text-destructive hover:bg-destructive/10"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                        </Button>
                    )}
                </div>
            </div>

            {/* Overview Header Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Contact Card */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-primary" />
                            Contact Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5 text-xs">
                        <div className="flex items-center gap-2 text-foreground">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{patient.phone}</span>
                        </div>
                        {patient.email ? (
                            <div className="flex items-center gap-2 text-foreground">
                                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="truncate">{patient.email}</span>
                            </div>
                        ) : (
                            <span className="text-muted-foreground italic">No email on record</span>
                        )}
                    </CardContent>
                </Card>

                {/* Clinical Condition Card */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                            <HeartPulse className="h-3.5 w-3.5 text-rose-500" />
                            Condition / Diagnosis
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-xs">
                        <Badge variant="info" className="font-medium text-xs">
                            {patient.condition}
                        </Badge>
                        <p className="text-[11px] text-muted-foreground pt-1">
                            Registered on {format(new Date(patient.createdAt), "MMM d, yyyy")}
                        </p>
                    </CardContent>
                </Card>

                {/* Assigned Practitioner Card */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                            <Stethoscope className="h-3.5 w-3.5 text-primary" />
                            Assigned Practitioner
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-xs">
                        {assignedDoctor ? (
                            <div>
                                <Link
                                    href={`/doctors/${assignedDoctor._id}`}
                                    className="font-medium text-foreground hover:text-primary hover:underline flex items-center gap-1"
                                >
                                    Dr. {assignedDoctor.name}
                                    <ExternalLink className="h-3 w-3 text-muted-foreground inline" />
                                </Link>
                                <p className="text-[11px] text-muted-foreground">
                                    {assignedDoctor.specialization} &bull; {assignedDoctor.hospital}
                                </p>
                            </div>
                        ) : (
                            <span className="text-muted-foreground italic">No assigned practitioner</span>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Navigation Tabs */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
                <TabsList className="bg-muted/60 p-1">
                    <TabsTrigger value="overview" className="text-xs">
                        Overview
                    </TabsTrigger>
                    <TabsTrigger value="appointments" className="text-xs">
                        Appointments ({appointments.length})
                    </TabsTrigger>
                    {/* Visits tab is visible ONLY to admin and treating doctor */}
                    {canReadVisits && (
                        <TabsTrigger value="visits" className="text-xs">
                            Visits
                        </TabsTrigger>
                    )}
                </TabsList>

                {/* Tab 1: Overview */}
                <TabsContent value="overview" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-semibold">Patient Summary</CardTitle>
                            <CardDescription className="text-xs">
                                General medical and demographic summary for this patient.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <span className="text-muted-foreground block">Full Name</span>
                                    <span className="font-medium text-foreground">{patient.name}</span>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-muted-foreground block">Age & Gender</span>
                                    <span className="font-medium text-foreground capitalize">
                                        {patient.age} years old &bull; {patient.gender}
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-muted-foreground block">Primary Phone</span>
                                    <span className="font-medium text-foreground">{patient.phone}</span>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-muted-foreground block">Email Address</span>
                                    <span className="font-medium text-foreground">{patient.email || "—"}</span>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-muted-foreground block">Primary Medical Condition</span>
                                    <span className="font-medium text-foreground">{patient.condition}</span>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-muted-foreground block">Assigned Clinic / Hospital</span>
                                    <span className="font-medium text-foreground">
                                        {assignedDoctor?.hospital || "—"}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab 2: Appointments */}
                <TabsContent value="appointments" className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-semibold">Appointment History</h3>
                            <p className="text-xs text-muted-foreground">
                                Past and upcoming consultations for {patient.name}.
                            </p>
                        </div>
                        {canBookAppointment && (
                            <Button
                                size="sm"
                                onClick={() => setBookAppointmentOpen(true)}
                                className="text-xs h-8 gap-1.5"
                            >
                                <CalendarPlus className="h-3.5 w-3.5" />
                                Book Appointment
                            </Button>
                        )}
                    </div>

                    {isAppointmentsLoading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : appointments.length === 0 ? (
                        <Card className="p-8 text-center border-dashed">
                            <Calendar className="mx-auto h-8 w-8 text-muted-foreground/60" />
                            <p className="mt-2 text-xs text-muted-foreground">
                                No appointments found for this patient.
                            </p>
                            {canBookAppointment && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setBookAppointmentOpen(true)}
                                    className="mt-4 text-xs h-8"
                                >
                                    Book First Appointment
                                </Button>
                            )}
                        </Card>
                    ) : (
                        <div className="border rounded-lg overflow-hidden bg-card">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/40">
                                        <TableHead className="text-xs font-semibold">Date & Time</TableHead>
                                        <TableHead className="text-xs font-semibold">Doctor</TableHead>
                                        <TableHead className="text-xs font-semibold">Status</TableHead>
                                        <TableHead className="text-xs font-semibold">Reason</TableHead>
                                        <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {appointments.map((appt) => {
                                        const doc =
                                            typeof appt.doctorId === "object"
                                                ? (appt.doctorId as Doctor)
                                                : null;
                                        return (
                                            <TableRow key={appt._id}>
                                                <TableCell className="text-xs font-medium">
                                                    {formatInDoctorTz(appt.startsAt)}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    Dr. {doc?.name || "Practitioner"}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={
                                                            appt.status === "completed"
                                                                ? "default"
                                                                : appt.status === "scheduled"
                                                                ? "outline"
                                                                : appt.status === "cancelled"
                                                                ? "destructive"
                                                                : "secondary"
                                                        }
                                                        className="text-[11px] capitalize"
                                                    >
                                                        {appt.status.replace("_", " ")}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground truncate max-w-xs">
                                                    {appt.reason || "General Consultation"}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedAppointment(appt);
                                                            setAppointmentDetailsOpen(true);
                                                        }}
                                                        className="h-7 text-xs"
                                                    >
                                                        View Details
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </TabsContent>

                {/* Tab 3: Visits */}
                <TabsContent value="visits" className="space-y-4">
                    {!canReadVisits ? (
                        /* Direct URL access fallback if user typed ?tab=visits directly */
                        <Card className="border-destructive/30 bg-destructive/10 p-8 text-center max-w-lg mx-auto">
                            <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
                            <h3 className="mt-3 text-sm font-semibold text-destructive">
                                Access Denied
                            </h3>
                            <p className="mt-1 text-xs text-muted-foreground">
                                You do not have permission to view clinical visit records for this patient. Only administrators and treating practitioners may access clinical timelines.
                            </p>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold">Clinical Visits Timeline</h3>
                                    <p className="text-xs text-muted-foreground">
                                        Medical history, examination notes, and prescriptions recorded by treating practitioners.
                                    </p>
                                </div>
                                {canCreateVisit && (
                                    <Button
                                        size="sm"
                                        onClick={() => setRecordVisitOpen(true)}
                                        className="text-xs h-8 gap-1.5"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Record Visit
                                    </Button>
                                )}
                            </div>

                            <VisitsTimeline
                                patientId={patientId}
                                patientName={patient.name}
                                doctorTimezone={doctorTimezone}
                            />
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Edit Patient Dialog */}
            <EditPatientDialog
                patient={patient}
                open={editPatientOpen}
                onOpenChange={setEditPatientOpen}
            />

            {/* Delete Patient Confirmation Dialog */}
            <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Patient Record</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete {patient.name}&apos;s record? All upcoming scheduled appointments for this patient will be automatically cancelled.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteMutation.isPending}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                deleteMutation.mutate();
                            }}
                            disabled={deleteMutation.isPending}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleteMutation.isPending ? "Deleting..." : "Delete Patient"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Book Appointment Dialog */}
            <BookAppointmentDialog
                open={bookAppointmentOpen}
                onOpenChange={setBookAppointmentOpen}
                initialDoctorId={assignedDoctorId}
                initialPatientId={patientId}
            />

            {/* Appointment Details Dialog */}
            <AppointmentDetailsDialog
                appointment={selectedAppointment}
                open={appointmentDetailsOpen}
                onOpenChange={setAppointmentDetailsOpen}
            />

            {/* Record Visit Dialog */}
            <RecordVisitDialog
                open={recordVisitOpen}
                onOpenChange={setRecordVisitOpen}
                patientId={patientId}
                patientName={patient.name}
                doctorTimezone={doctorTimezone}
            />
        </div>
    );
}

export default function PatientDetailPage() {
    return (
        <Suspense
            fallback={
                <div className="space-y-4 p-6">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-32 w-full" />
                </div>
            }
        >
            <PatientDetailContent />
        </Suspense>
    );
}
