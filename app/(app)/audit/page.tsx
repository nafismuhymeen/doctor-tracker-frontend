"use client";

import React, { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Activity, Clock, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { RequireRole } from "@/components/auth/require-role";
import { getViewerTimeZone, localDateToUtcIso } from "@/lib/audit-utils";
import { AuditFilters, type AuditFiltersState } from "@/components/audit/audit-filters";
import { AuditTable } from "@/components/audit/audit-table";
import type { ApiResponse, AuditLogsResponse } from "@/types";

export default function AuditPage() {
    return (
        <RequireRole action="audit.view">
            <AuditPageContent />
        </RequireRole>
    );
}

function AuditPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // 1. Read filters from URL search params (with graceful fallbacks)
    const pageParam = parseInt(searchParams.get("page") || "1", 10);
    const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
    const limit = 20;

    const action = searchParams.get("action") || undefined;
    const entityType = searchParams.get("entityType") || undefined;
    const rawOutcome = searchParams.get("outcome");
    const outcome = rawOutcome === "success" || rawOutcome === "failure" ? rawOutcome : undefined;
    const actorId = searchParams.get("actorId") || undefined;
    const entityId = searchParams.get("entityId") || undefined;
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;

    const filters: AuditFiltersState = useMemo(
        () => ({
            action,
            entityType,
            outcome,
            actorId,
            entityId,
            from,
            to,
        }),
        [action, entityType, outcome, actorId, entityId, from, to]
    );

    // 2. Build API query string: dates converted from local YYYY-MM-DD to UTC ISO
    const apiQueryString = useMemo(() => {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", String(limit));

        if (action) params.set("action", action);
        if (entityType) params.set("entityType", entityType);
        if (outcome) params.set("outcome", outcome);
        if (actorId) params.set("actorId", actorId);
        if (entityId) params.set("entityId", entityId);

        if (from) {
            const utcFrom = localDateToUtcIso(from, "start");
            if (utcFrom) params.set("from", utcFrom);
        }
        if (to) {
            const utcTo = localDateToUtcIso(to, "end");
            if (utcTo) params.set("to", utcTo);
        }

        return params.toString();
    }, [page, limit, action, entityType, outcome, actorId, entityId, from, to]);

    // 3. Fetch audit logs
    const { data, isLoading } = useQuery({
        queryKey: qk.audit.list(apiQueryString),
        queryFn: () =>
            api.get<ApiResponse<AuditLogsResponse>>(`/audit?${apiQueryString}`),
    });

    const logs = data?.data?.logs ?? [];
    const pagination = data?.data?.pagination;

    // 4. URL updates
    const updateUrl = (updates: Partial<AuditFiltersState>, newPage?: number) => {
        const nextParams = new URLSearchParams();

        const nextPage = newPage !== undefined ? newPage : 1;
        if (nextPage > 1) nextParams.set("page", String(nextPage));

        const nextAction = updates.action !== undefined ? updates.action : action;
        const nextEntityType = updates.entityType !== undefined ? updates.entityType : entityType;
        const nextOutcome = updates.outcome !== undefined ? updates.outcome : outcome;
        const nextActorId = updates.actorId !== undefined ? updates.actorId : actorId;
        const nextEntityId = updates.entityId !== undefined ? updates.entityId : entityId;
        const nextFrom = updates.from !== undefined ? updates.from : from;
        const nextTo = updates.to !== undefined ? updates.to : to;

        if (nextAction) nextParams.set("action", nextAction);
        if (nextEntityType) nextParams.set("entityType", nextEntityType);
        if (nextOutcome) nextParams.set("outcome", nextOutcome);
        if (nextActorId) nextParams.set("actorId", nextActorId);
        if (nextEntityId) nextParams.set("entityId", nextEntityId);
        if (nextFrom) nextParams.set("from", nextFrom);
        if (nextTo) nextParams.set("to", nextTo);

        const qs = nextParams.toString();
        router.replace(qs ? `/audit?${qs}` : "/audit");
    };

    const handleFilterChange = (updated: Partial<AuditFiltersState>) => {
        updateUrl(updated, 1);
    };

    const handleReset = () => {
        router.replace("/audit");
    };

    const handlePageChange = (newPage: number) => {
        updateUrl({}, newPage);
    };

    const viewerZone = getViewerTimeZone();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Activity className="h-6 w-6 text-primary" />
                        Audit Logs
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        System security trail, administrative changes, and clinical access events.
                    </p>
                </div>

                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-muted/30 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    <span>
                        Zone: <strong className="text-foreground">{viewerZone}</strong>
                    </span>
                    <span className="text-muted-foreground/50">|</span>
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Append-only</span>
                </div>
            </div>

            {/* Filters */}
            <AuditFilters
                filters={filters}
                onChange={handleFilterChange}
                onReset={handleReset}
            />

            {/* Audit Log Table */}
            <AuditTable
                logs={logs}
                pagination={pagination}
                isLoading={isLoading}
                page={page}
                onPageChange={handlePageChange}
            />
        </div>
    );
}

