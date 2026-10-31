"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    createColumnHelper,
} from "@tanstack/react-table";
import {
    Search,
    Users,
    Edit2,
    Trash2,
    ChevronLeft,
    ChevronRight,
    RotateCcw,
    Activity,
    Phone,
    Mail,
} from "lucide-react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { AppLayout } from "@/components/layout/app-layout";
import { EditPatientDialog } from "@/components/patients/edit-patient-dialog";
import { DatePicker } from "@/components/ui/date-picker";
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type {
    ApiResponse,
    Patient,
    PatientsResponse,
} from "@/types";

const columnHelper = createColumnHelper<Patient>();

export default function PatientsPage() {
    const queryClient = useQueryClient();

    // Filters & Pagination states
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [search, setSearch] = useState("");
    const [condition, setCondition] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Debounce text inputs to avoid repeated API requests while typing
    const debouncedSearch = useDebounce(search, 400);
    const debouncedCondition = useDebounce(condition, 400);

    // Reset pagination to page 1 when any filter changes
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, debouncedCondition, startDate, endDate]);

    // Edit dialog state
    const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);

    // Delete confirmation alert dialog state
    const [deletingPatient, setDeletingPatient] = useState<Patient | null>(null);

    // Construct query parameters string
    const queryParams = useMemo(() => {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", String(limit));
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (debouncedCondition) params.set("condition", debouncedCondition);
        if (startDate) params.set("startDate", startDate);
        if (endDate) params.set("endDate", endDate);
        return params.toString();
    }, [page, limit, debouncedSearch, debouncedCondition, startDate, endDate]);

    // Query patients list
    const { data: response, isLoading } = useQuery({
        queryKey: ["patients", queryParams],
        queryFn: () =>
            api.get<ApiResponse<PatientsResponse>>(`/patients?${queryParams}`),
    });

    const patients = response?.data?.patients || [];
    const pagination = response?.data?.pagination;

    // Delete patient mutation
    const deleteMutation = useMutation({
        mutationFn: (patientId: string) => api.delete(`/patients/${patientId}`),
        onSuccess: () => {
            toast.success("Patient deleted successfully");
            queryClient.invalidateQueries({ queryKey: ["patients"] });
            queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
        },
        onError: (error: any) => {
            const message =
                error instanceof ApiError
                    ? error.message
                    : "Failed to delete patient";
            toast.error("Error", { description: message });
        },
    });

    // Reset filters
    const handleReset = () => {
        setSearch("");
        setCondition("");
        setStartDate("");
        setEndDate("");
        setPage(1);
    };

    // Define table columns
    const columns = useMemo(
        () => [
            columnHelper.accessor("name", {
                header: "Patient Name",
                cell: (info) => (
                    <div className="font-medium text-foreground">
                        {info.getValue()}
                    </div>
                ),
            }),
            columnHelper.display({
                id: "demographics",
                header: "Demographics",
                cell: ({ row }) => (
                    <Badge variant="outline" className="text-xs capitalize font-normal">
                        {row.original.gender}, {row.original.age} yrs
                    </Badge>
                ),
            }),
            columnHelper.accessor("condition", {
                header: "Condition / Diagnosis",
                cell: (info) => (
                    <Badge variant="info" className="font-normal text-xs">
                        {info.getValue()}
                    </Badge>
                ),
            }),
            columnHelper.accessor("doctorId", {
                header: "Assigned Doctor",
                cell: (info) => {
                    const doc = info.getValue();
                    if (!doc || typeof doc === "string") {
                        return (
                            <span className="text-xs text-muted-foreground">
                                Assigned
                            </span>
                        );
                    }
                    return (
                        <div className="text-xs">
                            <p className="font-medium text-foreground">
                                {doc.name}
                            </p>
                            <p className="text-muted-foreground">
                                {doc.specialization}
                            </p>
                        </div>
                    );
                },
            }),
            columnHelper.display({
                id: "contact",
                header: "Contact Info",
                cell: ({ row }) => (
                    <div className="text-xs text-muted-foreground space-y-0.5">
                        <div className="flex items-center gap-1 font-mono text-[11px]">
                            <Phone className="h-3 w-3 shrink-0" />
                            {row.original.phone}
                        </div>
                        {row.original.email && (
                            <div className="flex items-center gap-1 truncate max-w-[150px]">
                                <Mail className="h-3 w-3 shrink-0" />
                                {row.original.email}
                            </div>
                        )}
                    </div>
                ),
            }),
            columnHelper.accessor("createdAt", {
                header: "Registered",
                cell: (info) => (
                    <span className="text-xs text-muted-foreground">
                        {new Date(info.getValue()).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                        })}
                    </span>
                ),
            }),
            columnHelper.display({
                id: "actions",
                header: "Actions",
                cell: ({ row }) => (
                    <div className="flex items-center gap-1">
                        {/* Edit Patient */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-muted"
                            onClick={() => {
                                setEditingPatient(row.original);
                                setEditDialogOpen(true);
                            }}
                            title="Edit patient details"
                        >
                            <Edit2 className="h-4 w-4 text-muted-foreground" />
                        </Button>

                        {/* Delete Patient */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setDeletingPatient(row.original)}
                            disabled={deleteMutation.isPending && deletingPatient?._id === row.original._id}
                            title="Delete patient"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ),
            }),
        ],
        [deleteMutation, deletingPatient]
    );

    const table = useReactTable({
        data: patients,
        columns,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
        pageCount: pagination?.totalPages ?? 1,
    });

    return (
        <AppLayout>
            <div className="space-y-6 min-w-0 max-w-full">
                {/* Header */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                            Patient Management
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Dedicated patient registry with search, filter, edit, and deletion capabilities
                        </p>
                    </div>
                </div>

                {/* Filters & Search Toolbar (§2.3 Search & Filtering) */}
                <Card>
                    <CardHeader className="pb-3 pt-4 px-4 sm:px-6">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Search className="h-4 w-4 text-primary" />
                            Search & Filters
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 sm:px-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {/* Search by Name or Phone */}
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search name or phone..."
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        setPage(1);
                                    }}
                                    className="pl-9 h-9"
                                />
                            </div>

                            {/* Filter by Condition */}
                            <div className="relative">
                                <Activity className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Filter condition..."
                                    value={condition}
                                    onChange={(e) => {
                                        setCondition(e.target.value);
                                        setPage(1);
                                    }}
                                    className="pl-9 h-9"
                                />
                            </div>

                            {/* Start Date */}
                            <DatePicker
                                value={startDate}
                                onChange={(val) => {
                                    setStartDate(val);
                                    setPage(1);
                                }}
                                placeholder="Start Date"
                            />

                            {/* End Date & Reset */}
                            <div className="flex items-center gap-2">
                                <DatePicker
                                    value={endDate}
                                    onChange={(val) => {
                                        setEndDate(val);
                                        setPage(1);
                                    }}
                                    placeholder="End Date"
                                />
                                {(search ||
                                    condition ||
                                    startDate ||
                                    endDate) && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 shrink-0"
                                            onClick={handleReset}
                                            title="Clear all filters"
                                        >
                                            <RotateCcw className="h-4 w-4" />
                                        </Button>
                                    )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Data Table Card */}
                <Card className="min-w-0 max-w-full overflow-hidden">
                    <CardContent className="p-0 min-w-0 max-w-full">
                        {isLoading ? (
                            <div className="p-6 space-y-3">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        ) : patients.length === 0 ? (
                            <div className="text-center py-16">
                                <Users className="mx-auto h-10 w-10 text-muted-foreground/60" />
                                <h3 className="mt-2 text-base font-semibold">
                                    No patients found
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                                    Try adjusting your filters or assign new patients under the Doctors page.
                                </p>
                            </div>
                        ) : (
                            <Table className="min-w-[850px]">
                                <TableHeader>
                                    {table.getHeaderGroups().map((headerGroup) => (
                                        <TableRow key={headerGroup.id}>
                                            {headerGroup.headers.map((header) => (
                                                <TableHead key={header.id}>
                                                    {header.isPlaceholder
                                                        ? null
                                                        : flexRender(
                                                            header.column.columnDef
                                                                .header,
                                                            header.getContext()
                                                        )}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableHeader>
                                <TableBody>
                                    {table.getRowModel().rows.map((row) => (
                                        <TableRow key={row.id}>
                                            {row.getVisibleCells().map((cell) => (
                                                <TableCell key={cell.id}>
                                                    {flexRender(
                                                        cell.column.columnDef.cell,
                                                        cell.getContext()
                                                    )}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}

                        {/* Pagination Bar */}
                        {pagination && pagination.totalPages > 0 && (
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
                                    ({pagination.totalPatients ?? 0} total patients)
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 gap-1 text-xs"
                                        onClick={() =>
                                            setPage((p) => Math.max(1, p - 1))
                                        }
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
                                                Math.min(
                                                    pagination.totalPages,
                                                    p + 1
                                                )
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

            {/* Edit Patient Dialog */}
            <EditPatientDialog
                patient={editingPatient}
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
            />

            {/* Delete Patient Confirmation Alert Dialog */}
            <AlertDialog
                open={!!deletingPatient}
                onOpenChange={(open) => {
                    if (!open) setDeletingPatient(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Patient Record</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to permanently delete patient{" "}
                            <span className="font-semibold text-foreground">
                                {deletingPatient?.name}
                            </span>
                            ? This action cannot be undone and will remove all their medical history.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteMutation.isPending}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                if (deletingPatient) {
                                    deleteMutation.mutate(deletingPatient._id, {
                                        onSettled: () => setDeletingPatient(null),
                                    });
                                }
                            }}
                            disabled={deleteMutation.isPending}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleteMutation.isPending ? "Deleting..." : "Delete Patient"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}

