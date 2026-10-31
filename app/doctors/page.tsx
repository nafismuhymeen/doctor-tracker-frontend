"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    createColumnHelper,
} from "@tanstack/react-table";
import {
    Search,
    Stethoscope,
    Users,
    ChevronLeft,
    ChevronRight,
    RotateCcw,
    Building2,
    Briefcase,
} from "lucide-react";

import { api } from "@/lib/api";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { AppLayout } from "@/components/layout/app-layout";
import { CreateDoctorDialog } from "@/components/doctors/create-doctor-dialog";
import { DatePicker } from "@/components/ui/date-picker";
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
import type { ApiResponse, Doctor, DoctorsResponse } from "@/types";

const columnHelper = createColumnHelper<Doctor>();

export default function DoctorsPage() {
    // Filter & Pagination states
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [search, setSearch] = useState("");
    const [specialization, setSpecialization] = useState("");
    const [hospital, setHospital] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Debounce text inputs to avoid repeated API requests while typing
    const debouncedSearch = useDebounce(search, 400);
    const debouncedSpecialization = useDebounce(specialization, 400);
    const debouncedHospital = useDebounce(hospital, 400);

    // Reset pagination to page 1 when any filter changes
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, debouncedSpecialization, debouncedHospital, startDate, endDate]);

    // Build query params string
    const queryParams = useMemo(() => {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", String(limit));
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (debouncedSpecialization) params.set("specialization", debouncedSpecialization);
        if (debouncedHospital) params.set("hospital", debouncedHospital);
        if (startDate) params.set("startDate", startDate);
        if (endDate) params.set("endDate", endDate);
        return params.toString();
    }, [page, limit, debouncedSearch, debouncedSpecialization, debouncedHospital, startDate, endDate]);

    const { data: response, isLoading } = useQuery({
        queryKey: ["doctors", queryParams],
        queryFn: () =>
            api.get<ApiResponse<DoctorsResponse>>(`/doctors?${queryParams}`),
    });

    const doctors = response?.data?.doctors || [];
    const pagination = response?.data?.pagination;

    // Reset all filters
    const handleReset = () => {
        setSearch("");
        setSpecialization("");
        setHospital("");
        setStartDate("");
        setEndDate("");
        setPage(1);
    };

    // Define table columns
    const columns = useMemo(
        () => [
            columnHelper.accessor("name", {
                header: "Doctor Name",
                cell: (info) => (
                    <div className="font-medium text-foreground flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs uppercase">
                            {info.getValue().charAt(0)}
                        </div>
                        <span>{info.getValue()}</span>
                    </div>
                ),
            }),
            columnHelper.accessor("specialization", {
                header: "Specialization",
                cell: (info) => (
                    <Badge variant="secondary" className="font-normal text-xs">
                        {info.getValue()}
                    </Badge>
                ),
            }),
            columnHelper.accessor("hospital", {
                header: "Hospital",
                cell: (info) => (
                    <span className="text-sm text-muted-foreground">
                        {info.getValue()}
                    </span>
                ),
            }),
            columnHelper.accessor("phone", {
                header: "Phone",
                cell: (info) => (
                    <span className="font-mono text-xs">{info.getValue()}</span>
                ),
            }),
            columnHelper.accessor("email", {
                header: "Email",
                cell: (info) => (
                    <span className="text-xs text-muted-foreground truncate max-w-[160px] block">
                        {info.getValue()}
                    </span>
                ),
            }),
            columnHelper.accessor("createdAt", {
                header: "Joined Date",
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
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 h-8 text-xs"
                        asChild
                    >
                        <Link href={`/doctors/${row.original._id}`}>
                            <Users className="h-3.5 w-3.5" />
                            Patients
                        </Link>
                    </Button>
                ),
            }),
        ],
        []
    );

    const table = useReactTable({
        data: doctors,
        columns,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
        pageCount: pagination?.totalPages ?? 1,
    });

    return (
        <AppLayout>
            <div className="space-y-6 min-w-0 max-w-full">
                {/* Header with Title and Add Doctor dialog */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                            Doctor Management
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Search, filter, paginate, and manage doctors and their patient rosters
                        </p>
                    </div>

                    <CreateDoctorDialog />
                </div>

                {/* Filters & Search Toolbar */}
                <Card>
                    <CardHeader className="pb-3 pt-4 px-4 sm:px-6">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Search className="h-4 w-4 text-primary" />
                            Search & Filters
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 sm:px-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                            {/* Search by name */}
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search doctor..."
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        setPage(1);
                                    }}
                                    className="pl-9 h-9"
                                />
                            </div>

                            {/* Filter by Specialization */}
                            <div className="relative">
                                <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Filter by specialty..."
                                    value={specialization}
                                    onChange={(e) => {
                                        setSpecialization(e.target.value);
                                        setPage(1);
                                    }}
                                    className="pl-9 h-9"
                                />
                            </div>

                            {/* Filter by Hospital */}
                            <div className="relative">
                                <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Filter by hospital..."
                                    value={hospital}
                                    onChange={(e) => {
                                        setHospital(e.target.value);
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
                                    specialization ||
                                    hospital ||
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

                {/* TanStack Data Table Card */}
                <Card className="min-w-0 max-w-full overflow-hidden">
                    <CardContent className="p-0 min-w-0 max-w-full">
                        {isLoading ? (
                            <div className="p-6 space-y-3">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        ) : doctors.length === 0 ? (
                            <div className="text-center py-16">
                                <Stethoscope className="mx-auto h-10 w-10 text-muted-foreground/60" />
                                <h3 className="mt-2 text-base font-semibold">
                                    No doctors found
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                                    Try adjusting your search criteria or add a new doctor using the button above.
                                </p>
                            </div>
                        ) : (
                            <Table className="min-w-[800px]">
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
                                    ({pagination.totalDoctors ?? 0} total doctors)
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
        </AppLayout>
    );
}

