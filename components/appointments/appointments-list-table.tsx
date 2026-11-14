"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    type ColumnDef,
} from "@tanstack/react-table";
import {
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    User,
    Stethoscope,
    ChevronLeft,
    ChevronRight,
    Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { Appointment, Doctor, Patient, Pagination } from "@/types";

interface AppointmentsListTableProps {
    appointments: Appointment[];
    pagination?: Pagination;
    page: number;
    setPage: (page: number | ((prev: number) => number)) => void;
    isLoading: boolean;
    onSelectAppointment: (appointment: Appointment) => void;
}

export function AppointmentsListTable({
    appointments,
    pagination,
    page,
    setPage,
    isLoading,
    onSelectAppointment,
}: AppointmentsListTableProps) {
    const columns = useMemo<ColumnDef<Appointment>[]>(
        () => [
            {
                accessorKey: "patientId",
                header: "Patient",
                cell: ({ row }) => {
                    const patient =
                        typeof row.original.patientId === "object" && row.original.patientId !== null
                            ? (row.original.patientId as Patient)
                            : null;
                    return (
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold shrink-0">
                                {patient?.name?.charAt(0) || <User className="h-4 w-4" />}
                            </div>
                            <div className="min-w-0">
                                <div className="font-semibold text-foreground text-xs truncate">
                                    {patient?.name || "Patient"}
                                </div>
                                <div className="text-[11px] text-muted-foreground truncate">
                                    {patient?.phone || "No phone"}
                                </div>
                            </div>
                        </div>
                    );
                },
            },
            {
                accessorKey: "doctorId",
                header: "Practitioner",
                cell: ({ row }) => {
                    const doctor =
                        typeof row.original.doctorId === "object" && row.original.doctorId !== null
                            ? (row.original.doctorId as Doctor)
                            : null;
                    return (
                        <div className="flex items-center gap-1.5 min-w-0">
                            <Stethoscope className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                                <div className="font-medium text-foreground text-xs truncate">
                                    {doctor?.name || "Doctor"}
                                </div>
                                <div className="text-[11px] text-muted-foreground truncate">
                                    {doctor?.specialization || "Clinical"}
                                </div>
                            </div>
                        </div>
                    );
                },
            },
            {
                accessorKey: "startsAt",
                header: "Scheduled Window",
                cell: ({ row }) => {
                    const doctor =
                        typeof row.original.doctorId === "object" && row.original.doctorId !== null
                            ? (row.original.doctorId as Doctor)
                            : null;
                    const tz = doctor?.timezone || "UTC";

                    let timeDisplay = "";
                    try {
                        const s = new Intl.DateTimeFormat("en-US", {
                            timeZone: tz,
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            hourCycle: "h23",
                        }).format(new Date(row.original.startsAt));
                        const e = new Intl.DateTimeFormat("en-US", {
                            timeZone: tz,
                            hour: "2-digit",
                            minute: "2-digit",
                            hourCycle: "h23",
                        }).format(new Date(row.original.endsAt));
                        timeDisplay = `${s} – ${e} (${tz})`;
                    } catch {
                        timeDisplay = `${format(new Date(row.original.startsAt), "PPp")}`;
                    }

                    return (
                        <div className="text-xs font-mono">
                            <span className="font-semibold text-foreground">{timeDisplay}</span>
                        </div>
                    );
                },
            },
            {
                accessorKey: "status",
                header: "Status",
                cell: ({ row }) => {
                    const status = row.original.status;
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
                },
            },
            {
                accessorKey: "reason",
                header: "Reason / Notes",
                cell: ({ row }) => (
                    <span className="text-xs text-muted-foreground truncate max-w-[200px] block" title={row.original.reason || ""}>
                        {row.original.reason || "—"}
                    </span>
                ),
            },
            {
                id: "actions",
                header: "",
                cell: ({ row }) => (
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onSelectAppointment(row.original)}
                        className="h-7 text-xs gap-1"
                    >
                        <Eye className="h-3.5 w-3.5" />
                        Details
                    </Button>
                ),
            },
        ],
        [onSelectAppointment]
    );

    const table = useReactTable({
        data: appointments,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <div className="space-y-4">
            <div className="rounded-lg border bg-card overflow-hidden shadow-xs">
                <Table>
                    <TableHeader className="bg-muted/40">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id} className="text-xs font-semibold">
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                  header.column.columnDef.header,
                                                  header.getContext()
                                              )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="text-center py-10 text-xs text-muted-foreground">
                                    Loading appointment records...
                                </TableCell>
                            </TableRow>
                        ) : appointments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="text-center py-10 text-xs text-muted-foreground">
                                    No appointments found matching current filters.
                                </TableCell>
                            </TableRow>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id} className="hover:bg-muted/30">
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="py-2.5">
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-2 text-xs text-muted-foreground">
                    <div>
                        Showing Page <span className="font-semibold text-foreground">{page}</span> of{" "}
                        <span className="font-semibold text-foreground">{pagination.totalPages}</span> (
                        {pagination.totalAppointments ?? appointments.length} total)
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={!pagination.hasPreviousPage || isLoading}
                            onClick={() => setPage((p) => Math.max(p - 1, 1))}
                            className="h-8 text-xs gap-1"
                        >
                            <ChevronLeft className="h-3.5 w-3.5" />
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={!pagination.hasNextPage || isLoading}
                            onClick={() => setPage((p) => p + 1)}
                            className="h-8 text-xs gap-1"
                        >
                            Next
                            <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
