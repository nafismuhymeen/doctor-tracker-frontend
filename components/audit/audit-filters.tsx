"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
    RotateCcw,
    ShieldAlert,
    UserX,
    FileSearch,
    ListFilter,
} from "lucide-react";
import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "@/lib/audit-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { ApiResponse, UsersResponse } from "@/types";

export interface AuditFiltersState {
    action?: string;
    entityType?: string;
    outcome?: string;
    actorId?: string;
    entityId?: string;
    from?: string; // yyyy-MM-dd in viewer local
    to?: string;   // yyyy-MM-dd in viewer local
}

interface AuditFiltersProps {
    filters: AuditFiltersState;
    onChange: (updated: Partial<AuditFiltersState>) => void;
    onReset: () => void;
}

export function AuditFilters({ filters, onChange, onReset }: AuditFiltersProps) {
    const { data: usersData } = useQuery({
        queryKey: qk.users.list("limit=100"),
        queryFn: () => api.get<ApiResponse<UsersResponse>>("/users?limit=100"),
    });
    const users = usersData?.data?.users ?? [];

    const isPresetActive = (preset: "failedLogins" | "accessDenied" | "clinicalReads") => {
        if (preset === "failedLogins") {
            return filters.action === "auth.login.failure" && filters.outcome === "failure";
        }
        if (preset === "accessDenied") {
            return filters.action === "access.denied" && filters.outcome === "failure";
        }
        if (preset === "clinicalReads") {
            return filters.action === "visit.read";
        }
        return false;
    };

    const hasActiveFilters = Boolean(
        filters.action ||
        filters.entityType ||
        filters.outcome ||
        filters.actorId ||
        filters.entityId ||
        filters.from ||
        filters.to
    );

    return (
        <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
            {/* Quick Presets Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mr-1">
                        <ListFilter className="h-3.5 w-3.5" />
                        Presets:
                    </span>
                    <Button
                        type="button"
                        variant={!hasActiveFilters ? "secondary" : "outline"}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={onReset}
                    >
                        All logs
                    </Button>
                    <Button
                        type="button"
                        variant={isPresetActive("failedLogins") ? "secondary" : "outline"}
                        size="sm"
                        className="h-7 text-xs flex items-center gap-1"
                        onClick={() =>
                            onChange({
                                action: "auth.login.failure",
                                outcome: "failure",
                                entityType: undefined,
                                actorId: undefined,
                                entityId: undefined,
                            })
                        }
                    >
                        <UserX className="h-3.5 w-3.5 text-destructive" />
                        Failed logins
                    </Button>
                    <Button
                        type="button"
                        variant={isPresetActive("accessDenied") ? "secondary" : "outline"}
                        size="sm"
                        className="h-7 text-xs flex items-center gap-1"
                        onClick={() =>
                            onChange({
                                action: "access.denied",
                                outcome: "failure",
                                entityType: undefined,
                                actorId: undefined,
                                entityId: undefined,
                            })
                        }
                    >
                        <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                        Access denied
                    </Button>
                    <Button
                        type="button"
                        variant={isPresetActive("clinicalReads") ? "secondary" : "outline"}
                        size="sm"
                        className="h-7 text-xs flex items-center gap-1"
                        onClick={() =>
                            onChange({
                                action: "visit.read",
                                outcome: undefined,
                                entityType: undefined,
                                actorId: undefined,
                                entityId: undefined,
                            })
                        }
                    >
                        <FileSearch className="h-3.5 w-3.5 text-blue-500" />
                        Clinical record reads
                    </Button>
                </div>

                {hasActiveFilters && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                        onClick={onReset}
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reset filters
                    </Button>
                )}
            </div>

            {/* Filter Controls Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                {/* Action */}
                <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">Action</label>
                    <Select
                        value={filters.action || "all"}
                        onValueChange={(val) => onChange({ action: val === "all" ? undefined : val })}
                    >
                        <SelectTrigger className="h-8 text-xs" aria-label="Filter by audit action">
                            <SelectValue placeholder="All actions" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                            <SelectItem value="all">All actions</SelectItem>
                            {AUDIT_ACTIONS.map((a) => (
                                <SelectItem key={a.value} value={a.value}>
                                    {a.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Entity Type */}
                <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">Entity Type</label>
                    <Select
                        value={filters.entityType || "all"}
                        onValueChange={(val) => onChange({ entityType: val === "all" ? undefined : val })}
                    >
                        <SelectTrigger className="h-8 text-xs" aria-label="Filter by audit entity type">
                            <SelectValue placeholder="All entity types" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All entity types</SelectItem>
                            {AUDIT_ENTITY_TYPES.map((et) => (
                                <SelectItem key={et} value={et}>
                                    {et}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Outcome */}
                <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">Outcome</label>
                    <Select
                        value={filters.outcome || "all"}
                        onValueChange={(val) => onChange({ outcome: val === "all" ? undefined : val })}
                    >
                        <SelectTrigger className="h-8 text-xs" aria-label="Filter by audit outcome">
                            <SelectValue placeholder="All outcomes" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All outcomes</SelectItem>
                            <SelectItem value="success">Success</SelectItem>
                            <SelectItem value="failure">Failure</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Actor */}
                <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">Actor</label>
                    <Select
                        value={filters.actorId || "all"}
                        onValueChange={(val) => onChange({ actorId: val === "all" ? undefined : val })}
                    >
                        <SelectTrigger className="h-8 text-xs" aria-label="Filter by audit actor">
                            <SelectValue placeholder="All actors" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                            <SelectItem value="all">All actors</SelectItem>
                            {users.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                    {u.name} ({u.role})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Entity ID */}
                <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">Entity ID</label>
                    <Input
                        type="text"
                        placeholder="Search ID..."
                        value={filters.entityId || ""}
                        onChange={(e) => onChange({ entityId: e.target.value.trim() || undefined })}
                        className="h-8 text-xs font-mono"
                    />
                </div>

                {/* From Date (Local) */}
                <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">From Date (Local)</label>
                    <Input
                        type="date"
                        aria-label="From Date"
                        value={filters.from || ""}
                        onChange={(e) => onChange({ from: e.target.value || undefined })}
                        className="h-8 text-xs"
                    />
                </div>

                {/* To Date (Local) */}
                <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">To Date (Local)</label>
                    <Input
                        type="date"
                        aria-label="To Date"
                        value={filters.to || ""}
                        onChange={(e) => onChange({ to: e.target.value || undefined })}
                        className="h-8 text-xs"
                    />
                </div>
            </div>
        </div>
    );
}
