"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import {
    Activity,
    AlertCircle,
    Calendar,
    ChevronDown,
    ChevronRight,
    Clock,
    Edit2,
    FileText,
    Pill,
    PlusCircle,
    ChevronLeft,
    RefreshCw,
} from "lucide-react";

import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { RecordVisitDialog } from "@/components/visits/record-visit-dialog";
import { AddAddendumDialog } from "@/components/visits/add-addendum-dialog";
import type { ApiResponse, Visit, VisitsResponse, Doctor } from "@/types";

interface VisitsTimelineProps {
    patientId: string;
    patientName?: string;
    doctorTimezone?: string;
}

export function VisitsTimeline({
    patientId,
    patientName,
    doctorTimezone = "Asia/Dhaka",
}: VisitsTimelineProps) {
    const { user, can } = useAuth();
    const [page, setPage] = useState(1);
    const limit = 10;

    // Snapshot of client mount time for pure render calculation of remaining hours
    const [currentTime] = useState(() => Date.now());

    // Collapsed notes tracking
    const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

    // Dialog states
    const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [addendumVisitId, setAddendumVisitId] = useState<string | null>(null);
    const [addendumDialogOpen, setAddendumDialogOpen] = useState(false);

    // Query visits for this patient with short gcTime (5 minutes for privacy)
    const queryParams = `page=${page}&limit=${limit}`;
    const {
        data: visitsResponse,
        isLoading,
        isError,
        refetch,
    } = useQuery({
        queryKey: qk.visits.patient(patientId, queryParams),
        queryFn: () =>
            api.get<ApiResponse<VisitsResponse>>(
                `/patients/${patientId}/visits?${queryParams}`
            ),
        enabled: !!patientId,
        gcTime: 5 * 60 * 1000,
        staleTime: 30 * 1000,
    });

    const visitsData = visitsResponse?.data;
    const visits: Visit[] = visitsData?.visits || [];
    const pagination = visitsData?.pagination;

    const toggleNotes = (visitId: string) => {
        setExpandedNotes((prev) => ({
            ...prev,
            [visitId]: !prev[visitId],
        }));
    };

    const handleSwitchToAddendum = (visitId: string) => {
        setEditDialogOpen(false);
        setEditingVisit(null);
        setAddendumVisitId(visitId);
        setAddendumDialogOpen(true);
    };

    const formatInDoctorTz = (dateStr?: string | null, pattern = "MMM d, yyyy") => {
        if (!dateStr) return "";
        try {
            return format(new TZDate(new Date(dateStr), doctorTimezone), pattern);
        } catch {
            return format(new Date(dateStr), pattern);
        }
    };

    return (
        <div className="space-y-6">
            {/* Loading Skeleton */}
            {isLoading && (
                <div className="space-y-4">
                    {[1, 2].map((i) => (
                        <Card key={i} className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <Skeleton className="h-5 w-48" />
                                <Skeleton className="h-5 w-32" />
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Error State */}
            {!isLoading && isError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center space-y-3">
                    <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
                    <p className="text-sm font-medium text-destructive">
                        Failed to load clinical timeline
                    </p>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        className="gap-2"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Retry
                    </Button>
                </div>
            )}

            {/* Empty State */}
            {!isLoading && !isError && visits.length === 0 && (
                <div className="rounded-lg border border-dashed p-10 text-center space-y-3">
                    <FileText className="mx-auto h-10 w-10 text-muted-foreground/60" />
                    <h3 className="text-base font-semibold">No Clinical Visits Recorded</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        No clinical visits have been recorded for this patient yet. Treating doctors can record visits using the button above or from past completed appointments.
                    </p>
                </div>
            )}

            {/* Visits List */}
            {!isLoading && !isError && visits.length > 0 && (
                <div className="relative border-l-2 border-primary/20 ml-4 space-y-6 pl-6">
                    {visits.map((visit) => {
                        const doctorObj =
                            typeof visit.doctorId === "object"
                                ? (visit.doctorId as Doctor)
                                : null;
                        const doctorName = doctorObj?.name || "Treating Doctor";
                        const doctorSpec = doctorObj?.specialization;

                        // Check 24-hour edit window
                        const createdAtTime = new Date(visit.createdAt).getTime();
                        const elapsedHours = (currentTime - createdAtTime) / (1000 * 60 * 60);
                        const isWithinEditWindow = elapsedHours < 24;
                        const remainingHours = Math.max(0, Math.ceil(24 - elapsedHours));

                        // Determine author/treating doctor permission
                        const visitDoctorId = doctorObj?._id || (typeof visit.doctorId === "string" ? visit.doctorId : "");
                        const authorDoctorId =
                            typeof visit.createdBy === "object" && visit.createdBy?._id
                                ? visit.createdBy._id
                                : typeof visit.createdBy === "string"
                                ? visit.createdBy
                                : visitDoctorId;

                        const canEdit =
                            isWithinEditWindow &&
                            can("visits.edit", {
                                doctorId: user?.doctorId,
                                targetDoctorId: visitDoctorId,
                                authorDoctorId: visitDoctorId,
                            });

                        const canAddAddendum = can("visits.addendum", {
                            doctorId: user?.doctorId,
                            targetDoctorId: visitDoctorId,
                            authorDoctorId: visitDoctorId,
                        });

                        const isNotesExpanded = !!expandedNotes[visit._id];

                        return (
                            <div key={visit._id} className="relative group">
                                {/* Timeline Dot */}
                                <div className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-primary ring-4 ring-background" />

                                <Card className="border shadow-xs transition-shadow hover:shadow-md">
                                    <CardHeader className="pb-3 border-b bg-muted/20">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-primary shrink-0" />
                                                    <span className="font-semibold text-sm">
                                                        {formatInDoctorTz(visit.visitDate, "MMMM d, yyyy")}
                                                    </span>
                                                    <Badge variant="outline" className="text-[10px] font-normal">
                                                        Dr. {doctorName}
                                                        {doctorSpec ? ` (${doctorSpec})` : ""}
                                                    </Badge>
                                                </div>
                                                <p className="text-[11px] text-muted-foreground">
                                                    Recorded on {formatInDoctorTz(visit.createdAt, "MMM d, yyyy 'at' h:mm a")} ({doctorTimezone})
                                                </p>
                                            </div>

                                            {/* Edit window badge & action buttons */}
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {isWithinEditWindow && (
                                                    <Badge
                                                        variant="secondary"
                                                        className="text-[11px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                                                    >
                                                        <Clock className="h-3 w-3 mr-1" />
                                                        Editable for {remainingHours} more {remainingHours === 1 ? "hour" : "hours"}
                                                    </Badge>
                                                )}

                                                {canEdit && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-7 text-xs gap-1"
                                                        onClick={() => {
                                                            setEditingVisit(visit);
                                                            setEditDialogOpen(true);
                                                        }}
                                                    >
                                                        <Edit2 className="h-3 w-3" />
                                                        Edit Visit
                                                    </Button>
                                                )}

                                                {canAddAddendum && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 text-xs gap-1 text-primary hover:text-primary"
                                                        onClick={() => {
                                                            setAddendumVisitId(visit._id);
                                                            setAddendumDialogOpen(true);
                                                        }}
                                                    >
                                                        <PlusCircle className="h-3 w-3" />
                                                        Add Addendum
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="pt-4 space-y-4">
                                        {/* Chief Complaint & Diagnosis */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="rounded-lg border bg-card p-3">
                                                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                                                    Chief Complaint
                                                </span>
                                                <p className="text-sm font-medium">{visit.chiefComplaint}</p>
                                            </div>
                                            <div className="rounded-lg border bg-card p-3">
                                                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                                                    Diagnosis
                                                </span>
                                                <p className="text-sm font-medium text-primary">{visit.diagnosis}</p>
                                            </div>
                                        </div>

                                        {/* Collapsible Clinical Notes */}
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                    Clinical Notes
                                                </span>
                                                {visit.notes && visit.notes.length > 200 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleNotes(visit._id)}
                                                        className="text-xs text-primary hover:underline flex items-center gap-0.5"
                                                    >
                                                        {isNotesExpanded ? (
                                                            <>Show less <ChevronDown className="h-3 w-3" /></>
                                                        ) : (
                                                            <>Show more <ChevronRight className="h-3 w-3" /></>
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                            <div className="rounded-md border bg-muted/30 p-3 text-xs leading-relaxed whitespace-pre-wrap">
                                                {isNotesExpanded || !visit.notes || visit.notes.length <= 200
                                                    ? visit.notes
                                                    : `${visit.notes.substring(0, 200)}...`}
                                            </div>
                                        </div>

                                        {/* Vitals Chips */}
                                        {visit.vitals && Object.values(visit.vitals).some((v) => v !== undefined && v !== null) && (
                                            <div className="space-y-1.5">
                                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                                                    Vitals
                                                </span>
                                                <div className="flex flex-wrap gap-2">
                                                    {(visit.vitals.bpSystolic || visit.vitals.bpDiastolic) && (
                                                        <Badge variant="outline" className="text-xs font-normal">
                                                            <Activity className="h-3 w-3 mr-1 text-emerald-600" />
                                                            BP: {visit.vitals.bpSystolic ?? "—"}/{visit.vitals.bpDiastolic ?? "—"} mmHg
                                                        </Badge>
                                                    )}
                                                    {visit.vitals.heartRate && (
                                                        <Badge variant="outline" className="text-xs font-normal">
                                                            <Activity className="h-3 w-3 mr-1 text-rose-600" />
                                                            HR: {visit.vitals.heartRate} bpm
                                                        </Badge>
                                                    )}
                                                    {visit.vitals.temperatureC && (
                                                        <Badge variant="outline" className="text-xs font-normal">
                                                            Temp: {visit.vitals.temperatureC}°C
                                                        </Badge>
                                                    )}
                                                    {visit.vitals.weightKg && (
                                                        <Badge variant="outline" className="text-xs font-normal">
                                                            Weight: {visit.vitals.weightKg} kg
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Prescriptions Table */}
                                        {visit.prescriptions && visit.prescriptions.length > 0 && (
                                            <div className="space-y-1.5">
                                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                                    <Pill className="h-3.5 w-3.5 text-sky-600" />
                                                    Prescriptions ({visit.prescriptions.length})
                                                </span>
                                                <div className="border rounded-md overflow-hidden">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow className="bg-muted/40">
                                                                <TableHead className="h-8 text-xs font-semibold">Medication</TableHead>
                                                                <TableHead className="h-8 text-xs font-semibold">Dose</TableHead>
                                                                <TableHead className="h-8 text-xs font-semibold">Frequency</TableHead>
                                                                <TableHead className="h-8 text-xs font-semibold text-right">Duration</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {visit.prescriptions.map((p, idx) => (
                                                                <TableRow key={idx} className="text-xs">
                                                                    <TableCell className="py-1.5 font-medium">{p.drug}</TableCell>
                                                                    <TableCell className="py-1.5 text-muted-foreground">{p.dose}</TableCell>
                                                                    <TableCell className="py-1.5 text-muted-foreground">{p.frequency}</TableCell>
                                                                    <TableCell className="py-1.5 text-right text-muted-foreground">
                                                                        {p.durationDays} {p.durationDays === 1 ? "day" : "days"}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </div>
                                        )}

                                        {/* Follow-up Date */}
                                        {visit.followUpDate && (
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 p-2 rounded-md">
                                                <Calendar className="h-3.5 w-3.5 text-primary" />
                                                <span>
                                                    Follow-up scheduled for: <strong className="text-foreground">{formatInDoctorTz(visit.followUpDate, "MMMM d, yyyy")}</strong>
                                                </span>
                                            </div>
                                        )}

                                        {/* Addenda List (Append-only) */}
                                        {visit.addenda && visit.addenda.length > 0 && (
                                            <div className="space-y-2 pt-2 border-t">
                                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                                                    Clinical Addenda ({visit.addenda.length})
                                                </span>
                                                <div className="space-y-2">
                                                    {visit.addenda.map((addendum, idx) => {
                                                        const authorName =
                                                            typeof addendum.by === "object" && addendum.by?.name
                                                                ? addendum.by.name
                                                                : "Treating Doctor";
                                                        return (
                                                            <div
                                                                key={addendum._id || idx}
                                                                className="rounded-md border border-amber-200/50 bg-amber-50/40 dark:border-amber-900/30 dark:bg-amber-950/20 p-2.5 space-y-1 text-xs"
                                                            >
                                                                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                                                    <span className="font-semibold text-foreground">
                                                                        Dr. {authorName}
                                                                    </span>
                                                                    <span>
                                                                        {formatInDoctorTz(addendum.at, "MMM d, yyyy 'at' h:mm a")}
                                                                    </span>
                                                                </div>
                                                                <p className="whitespace-pre-wrap leading-relaxed text-foreground">
                                                                    {addendum.text}
                                                                </p>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination Controls */}
            {!isLoading && pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t text-xs text-muted-foreground">
                    <div>
                        Showing page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalVisits ?? visits.length} total visits)
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={!pagination.hasPreviousPage}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            className="h-8 text-xs"
                        >
                            <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={!pagination.hasNextPage}
                            onClick={() => setPage((p) => p + 1)}
                            className="h-8 text-xs"
                        >
                            Next
                            <ChevronRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Edit Dialog */}
            <RecordVisitDialog
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                patientId={patientId}
                patientName={patientName}
                doctorTimezone={doctorTimezone}
                visitToEdit={editingVisit}
                onSwitchToAddendum={handleSwitchToAddendum}
            />

            {/* Add Addendum Dialog */}
            <AddAddendumDialog
                visitId={addendumVisitId}
                open={addendumDialogOpen}
                onOpenChange={setAddendumDialogOpen}
            />
        </div>
    );
}
