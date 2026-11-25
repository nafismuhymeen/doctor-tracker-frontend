"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
    AlertCircle,
    ArrowUpRight,
    ChevronDown,
    ChevronUp,
    Clock,
    History,
    User,
} from "lucide-react";
import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { formatViewerDateTime, getViewerTimeZone } from "@/lib/audit-utils";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AuditDiffViewer } from "@/components/audit/audit-diff-viewer";
import { AuditDetailDrawer } from "@/components/audit/audit-detail-drawer";
import type { ApiResponse, AuditLogsResponse } from "@/types";

interface EntityHistoryDrawerProps {
    entityType: "Doctor" | "Patient";
    entityId: string;
    entityName?: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EntityHistoryDrawer({
    entityType,
    entityId,
    entityName,
    open,
    onOpenChange,
}: EntityHistoryDrawerProps) {
    const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const queryParams = new URLSearchParams({
        entityType,
        entityId,
        limit: "10",
        page: "1",
    }).toString();

    const { data, isLoading, error } = useQuery({
        queryKey: qk.audit.list(queryParams),
        queryFn: () =>
            api.get<ApiResponse<AuditLogsResponse>>(`/audit?${queryParams}`),
        enabled: open && !!entityId,
    });

    const logs = data?.data?.logs ?? [];
    const totalCount = data?.data?.pagination?.totalAuditLogs ?? logs.length;

    const toggleExpand = (id: string) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto sm:max-w-2xl">
                    <DialogHeader className="border-b pb-4">
                        <div className="flex items-center justify-between gap-2 pr-6">
                            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                                <History className="h-5 w-5 text-primary" />
                                Audit History: {entityType}
                            </DialogTitle>
                            <Badge variant="outline" className="font-mono text-xs">
                                {totalCount} {totalCount === 1 ? "event" : "events"}
                            </Badge>
                        </div>
                        <DialogDescription className="text-xs text-muted-foreground flex items-center justify-between gap-2 mt-1">
                            <span>
                                {entityName ? `${entityName} • ` : ""}
                                <code className="text-[11px] font-mono">{entityId}</code>
                            </span>
                            <span className="text-[11px]">Zone: {getViewerTimeZone()}</span>
                        </DialogDescription>
                    </DialogHeader>

                    {isLoading ? (
                        <div className="space-y-3 py-4">
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                        </div>
                    ) : error ? (
                        <div className="py-8 text-center space-y-2">
                            <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
                            <p className="text-sm font-medium text-destructive">
                                Failed to load audit history
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {(error as Error)?.message || "Unable to fetch audit events."}
                            </p>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground text-sm">
                            <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            No audit events recorded for this {entityType.toLowerCase()} yet.
                        </div>
                    ) : (
                        <div className="space-y-4 py-3">
                            <div className="space-y-3">
                                {logs.map((log) => {
                                    const isExpanded = expandedIds.has(log._id);
                                    const hasChanges = (log.changes?.length ?? 0) > 0;

                                    return (
                                        <div
                                            key={log._id}
                                            className="border rounded-lg p-3 bg-muted/10 space-y-2 text-xs transition-colors hover:bg-muted/20"
                                        >
                                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                                <div className="flex items-center gap-2">
                                                    <Badge
                                                        variant={log.outcome === "success" ? "outline" : "destructive"}
                                                        className={
                                                            log.outcome === "success"
                                                                ? "text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                                                                : "text-[10px]"
                                                        }
                                                    >
                                                        {log.outcome}
                                                    </Badge>
                                                    <span className="font-mono font-medium text-foreground">
                                                        {log.action}
                                                    </span>
                                                </div>
                                                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    <span>{formatViewerDateTime(log.createdAt)}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                                                <div className="flex items-center gap-1.5 truncate">
                                                    <User className="h-3 w-3 shrink-0" />
                                                    <span className="truncate">
                                                        {log.actorEmail || "System"}
                                                        {log.actorRole ? ` (${log.actorRole})` : ""}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    {hasChanges && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 px-2 text-[11px] text-muted-foreground"
                                                            onClick={() => toggleExpand(log._id)}
                                                        >
                                                            {isExpanded ? (
                                                                <>
                                                                    Hide diff <ChevronUp className="h-3 w-3 ml-1" />
                                                                </>
                                                            ) : (
                                                                <>
                                                                    View diff ({log.changes?.length}){" "}
                                                                    <ChevronDown className="h-3 w-3 ml-1" />
                                                                </>
                                                            )}
                                                        </Button>
                                                    )}

                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 px-2 text-[11px] text-primary"
                                                        onClick={() => setSelectedAuditId(log._id)}
                                                    >
                                                        Details
                                                    </Button>
                                                </div>
                                            </div>

                                            {isExpanded && hasChanges && (
                                                <div className="pt-2 border-t mt-2">
                                                    <AuditDiffViewer changes={log.changes} />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="pt-3 border-t flex justify-end">
                                <Button asChild variant="outline" size="sm" className="text-xs">
                                    <Link
                                        href={`/audit?entityType=${entityType}&entityId=${entityId}`}
                                        onClick={() => onOpenChange(false)}
                                    >
                                        View all in Audit Log
                                        <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <AuditDetailDrawer
                auditId={selectedAuditId}
                open={!!selectedAuditId}
                onOpenChange={(isOpen) => {
                    if (!isOpen) setSelectedAuditId(null);
                }}
            />
        </>
    );
}
