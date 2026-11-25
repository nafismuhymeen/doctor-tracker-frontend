"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    createColumnHelper,
} from "@tanstack/react-table";
import {
    Users,
    Search,
    Edit2,
    KeyRound,
    RotateCcw,
    ChevronLeft,
    ChevronRight,
    Shield,
    CheckCircle2,
    XCircle,
} from "lucide-react";

import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { useAuth } from "@/components/providers/auth-provider";
import { RequireRole } from "@/components/auth/require-role";
import { CreateUserDialog } from "@/components/users/create-user-dialog";
import { EditUserDialog } from "@/components/users/edit-user-dialog";
import { ResetUserPasswordDialog } from "@/components/users/reset-user-password-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApiResponse, AppUser, Doctor, Role, UsersResponse } from "@/types";

const columnHelper = createColumnHelper<AppUser>();

const roleBadges: Record<Role, { label: string; className: string }> = {
    admin: {
        label: "Admin",
        className: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    },
    staff: {
        label: "Staff",
        className: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    },
    doctor: {
        label: "Doctor",
        className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    },
    viewer: {
        label: "Viewer",
        className: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800",
    },
};

export default function UsersPage() {
    const { user: currentUser } = useAuth();

    // Filters & Pagination
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState<string>("all");
    const [activeFilter, setActiveFilter] = useState<string>("all");

    // Dialog states
    const [editingUser, setEditingUser] = useState<AppUser | null>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [resettingUser, setResettingUser] = useState<AppUser | null>(null);
    const [resetOpen, setResetOpen] = useState(false);

    const debouncedSearch = useDebounce(search, 400);

    // Fetch doctors to display linked practitioner names
    const { data: doctorsData } = useQuery({
        queryKey: qk.doctors.list("limit=100"),
        queryFn: () =>
            api.get<ApiResponse<{ doctors: Doctor[] }>>("/doctors?limit=100"),
    });

    const doctorsMap = useMemo(() => {
        const map = new Map<string, Doctor>();
        (doctorsData?.data?.doctors || []).forEach((d) => map.set(d._id, d));
        return map;
    }, [doctorsData]);

    const queryParams = useMemo(() => {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", String(limit));
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (roleFilter !== "all") params.set("role", roleFilter);
        if (activeFilter !== "all") {
            params.set("isActive", activeFilter === "active" ? "true" : "false");
        }
        return params.toString();
    }, [page, limit, debouncedSearch, roleFilter, activeFilter]);

    const { data: response, isLoading } = useQuery({
        queryKey: qk.users.list(queryParams),
        queryFn: () => api.get<ApiResponse<UsersResponse>>(`/users?${queryParams}`),
    });

    const users = response?.data?.users || [];
    const pagination = response?.data?.pagination;

    const handleResetFilters = () => {
        setSearch("");
        setRoleFilter("all");
        setActiveFilter("all");
        setPage(1);
    };

    const columns = useMemo(
        () => [
            columnHelper.accessor("name", {
                header: "User",
                cell: ({ row }) => {
                    const isSelf = currentUser?.id === row.original.id;
                    return (
                        <div className="flex flex-col">
                            <div className="flex items-center gap-1.5 font-medium text-foreground">
                                <span>{row.original.name}</span>
                                {isSelf && (
                                    <Badge
                                        variant="outline"
                                        className="text-[10px] py-0 px-1 border-primary/40 text-primary font-normal"
                                    >
                                        You
                                    </Badge>
                                )}
                            </div>
                            <span className="text-xs text-muted-foreground font-normal">
                                {row.original.email}
                            </span>
                        </div>
                    );
                },
            }),
            columnHelper.accessor("role", {
                header: "Role",
                cell: (info) => {
                    const role = info.getValue();
                    const badge = roleBadges[role];
                    return (
                        <Badge
                            variant="outline"
                            className={`text-xs capitalize font-medium ${badge.className}`}
                        >
                            {badge.label}
                        </Badge>
                    );
                },
            }),
            columnHelper.display({
                id: "assignedDoctor",
                header: "Doctor Link",
                cell: ({ row }) => {
                    if (row.original.role !== "doctor") {
                        return <span className="text-xs text-muted-foreground">—</span>;
                    }
                    const docId = row.original.doctorId;
                    if (!docId) {
                        return (
                            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                                Unlinked
                            </Badge>
                        );
                    }
                    const doc = doctorsMap.get(docId);
                    return (
                        <div className="text-xs">
                            <p className="font-medium text-foreground">
                                {doc ? doc.name : "Assigned"}
                            </p>
                            {doc && (
                                <p className="text-[11px] text-muted-foreground">
                                    {doc.specialization}
                                </p>
                            )}
                        </div>
                    );
                },
            }),
            columnHelper.accessor("isActive", {
                header: "Status",
                cell: (info) => {
                    const active = info.getValue();
                    return active ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Active
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-medium">
                            <XCircle className="h-3.5 w-3.5" />
                            Disabled
                        </span>
                    );
                },
            }),
            columnHelper.accessor("lastLoginAt", {
                header: "Last Login",
                cell: (info) => {
                    const val = info.getValue();
                    if (!val) {
                        return (
                            <span className="text-xs text-muted-foreground italic">
                                Never
                            </span>
                        );
                    }
                    return (
                        <span className="text-xs text-muted-foreground">
                            {new Date(val).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                            })}
                        </span>
                    );
                },
            }),
            columnHelper.accessor("createdAt", {
                header: "Created",
                cell: (info) => (
                    <span className="text-xs text-muted-foreground">
                        {new Date(info.getValue()).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                        })}
                    </span>
                ),
            }),
            columnHelper.display({
                id: "actions",
                header: "Actions",
                cell: ({ row }) => {
                    const isSelf = currentUser?.id === row.original.id;
                    return (
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-muted"
                                onClick={() => {
                                    setEditingUser(row.original);
                                    setEditOpen(true);
                                }}
                                title={
                                    isSelf
                                        ? "Edit user details (role & active status locked for self)"
                                        : "Edit user account & permissions"
                                }
                                aria-label={
                                    isSelf
                                        ? "Edit user details (role & active status locked for self)"
                                        : "Edit user account & permissions"
                                }
                            >
                                <Edit2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-muted text-amber-600 hover:text-amber-700"
                                onClick={() => {
                                    setResettingUser(row.original);
                                    setResetOpen(true);
                                }}
                                title="Reset user password"
                                aria-label="Reset user password"
                            >
                                <KeyRound className="h-4 w-4" />
                            </Button>
                        </div>
                    );
                },
            }),
        ],
        [currentUser, doctorsMap]
    );

    const table = useReactTable({
        data: users,
        columns,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
        pageCount: pagination?.totalPages ?? 1,
    });

    return (
        <RequireRole action="users.manage">
            <div className="space-y-6 min-w-0 max-w-full">
                {/* Header */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2.5">
                            <Users className="h-7 w-7 text-primary" />
                            User Management
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Manage accounts, role assignments, practitioner associations, and credentials.
                        </p>
                    </div>
                    <div>
                        <CreateUserDialog />
                    </div>
                </div>

                {/* Filters toolbar */}
                <Card>
                    <CardHeader className="pb-3 pt-4 px-4 sm:px-6">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Search className="h-4 w-4 text-primary" />
                            Search & Filters
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 sm:px-6">
                        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                            {/* Search */}
                            <div className="relative sm:col-span-1 lg:col-span-2">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name or email..."
                                    aria-label="Search by name or email"
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        setPage(1);
                                    }}
                                    className="pl-9 h-9 text-xs"
                                />
                            </div>

                            {/* Role Filter */}
                            <div>
                                <Select
                                    value={roleFilter}
                                    onValueChange={(val) => {
                                        setRoleFilter(val);
                                        setPage(1);
                                    }}
                                >
                                    <SelectTrigger className="h-9 text-xs w-full" aria-label="Filter by role">
                                        <SelectValue placeholder="All Roles" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Roles</SelectItem>
                                        <SelectItem value="admin">Administrator</SelectItem>
                                        <SelectItem value="staff">Staff</SelectItem>
                                        <SelectItem value="doctor">Doctor</SelectItem>
                                        <SelectItem value="viewer">Viewer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Status & Reset */}
                            <div className="flex items-center gap-2">
                                <Select
                                    value={activeFilter}
                                    onValueChange={(val) => {
                                        setActiveFilter(val);
                                        setPage(1);
                                    }}
                                >
                                    <SelectTrigger className="h-9 text-xs w-full" aria-label="Filter by account status">
                                        <SelectValue placeholder="All Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="active">Active Only</SelectItem>
                                        <SelectItem value="inactive">Disabled Only</SelectItem>
                                    </SelectContent>
                                </Select>
                                {(search || roleFilter !== "all" || activeFilter !== "all") && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 shrink-0"
                                        onClick={handleResetFilters}
                                        title="Clear all filters"
                                        aria-label="Clear all filters"
                                    >
                                        <RotateCcw className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Users Table */}
                <Card className="min-w-0 max-w-full overflow-hidden">
                    <CardContent className="p-0 min-w-0 max-w-full">
                        {isLoading ? (
                            <div className="p-6 space-y-3">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        ) : users.length === 0 ? (
                            <div className="text-center py-16 px-4">
                                <Shield className="mx-auto h-10 w-10 text-muted-foreground/60" />
                                <h3 className="mt-2 text-base font-semibold">No users found</h3>
                                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                                    {search || roleFilter !== "all" || activeFilter !== "all"
                                        ? "No user records match your selected filters. Try broadening your criteria."
                                        : "No user accounts registered in the system."}
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto w-full">
                                <Table>
                                    <TableHeader>
                                        {table.getHeaderGroups().map((headerGroup) => (
                                            <TableRow key={headerGroup.id}>
                                                {headerGroup.headers.map((header) => (
                                                    <TableHead
                                                        key={header.id}
                                                        className="text-xs font-semibold whitespace-nowrap"
                                                    >
                                                        {flexRender(
                                                            header.column.columnDef.header,
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
                                                    <TableCell key={cell.id} className="whitespace-nowrap">
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
                            </div>
                        )}

                        {/* Pagination footer */}
                        {pagination && pagination.totalPages > 1 && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t text-xs text-muted-foreground">
                                <div>
                                    Showing page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalUsers} total users)
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        disabled={!pagination.hasPreviousPage}
                                        className="h-8 gap-1"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage((p) => p + 1)}
                                        disabled={!pagination.hasNextPage}
                                        className="h-8 gap-1"
                                    >
                                        Next
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Edit User Dialog */}
                <EditUserDialog
                    user={editingUser}
                    open={editOpen}
                    onOpenChange={setEditOpen}
                />

                {/* Reset User Password Dialog */}
                <ResetUserPasswordDialog
                    user={resettingUser}
                    open={resetOpen}
                    onOpenChange={setResetOpen}
                />
            </div>
        </RequireRole>
    );
}
