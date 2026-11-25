"use client";

import React, { useState } from "react";
import {
    Activity,
    ChevronLeft,
    ChevronRight,
    Eye,
} from "lucide-react";
import { formatViewerDateTime, getViewerTimeZone } from "@/lib/audit-utils";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AuditDetailDrawer } from "@/components/audit/audit-detail-drawer";
import type { AuditLog, Pagination } from "@/types";

interface AuditTableProps {
    logs: AuditLog[];
    pagination?: Pagination;
    isLoading: boolean;
    page: number;
    onPageChange: (newPage: number) => void;
}

export function AuditTable({
    logs,
    pagination,
    isLoading,
    page,
    onPageChange,
}: AuditTableProps) {
    const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);

    const totalLogs = pagination?.totalAuditLogs ?? logs.length;
    const totalPages = pagination?.totalPages ?? Math.max(1, Math.ceil(totalLogs / (pagination?.limit || 20)));
    const hasNext = pagination?.hasNextPage ?? page < totalPages;
    const hasPrev = pagination?.hasPreviousPage ?? page > 1;

    return (
        <div className="space-y-4">
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/30">
                            <TableHead className="w-[180px]">Timestamp</TableHead>
                            <TableHead>Actor</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Entity</TableHead>
                            <TableHead>Outcome</TableHead>
                            <TableHead>IP Address</TableHead>
                            <TableHead className="text-right">Details</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : logs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground text-sm">
                                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                    No audit logs found matching your filters.
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs.map((log) => (
                                <TableRow key={log._id} className="hover:bg-muted/40 transition-colors">
                                    <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                                        {formatViewerDateTime(log.createdAt)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-0.5 max-w-[180px]">
                                            <div className="text-xs font-medium truncate" title={log.actorEmail || "System"}>
                                                {log.actorEmail || <span className="text-muted-foreground italic">System</span>}
                                            </div>
                                            {log.actorRole && (
                                                <Badge variant="outline" className="text-[10px] uppercase font-mono px-1 py-0">
                                                    {log.actorRole}
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-mono text-xs font-medium text-foreground">
                                            {log.action}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {log.entityType ? (
                                            <div className="space-y-0.5">
                                                <Badge variant="secondary" className="text-[10px]">
                                                    {log.entityType}
                                                </Badge>
                                                {log.entityId && (
                                                    <div
                                                        className="font-mono text-[11px] text-muted-foreground truncate max-w-[120px]"
                                                        title={log.entityId}
                                                    >
                                                        {log.entityId}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground text-xs italic">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={log.outcome === "success" ? "outline" : "destructive"}
                                            className={
                                                log.outcome === "success"
                                                    ? "text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                                                    : "text-[11px] font-medium"
                                            }
                                        >
                                            {log.outcome}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs font-mono text-muted-foreground">
                                        {log.metadata?.ip || "—"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 text-xs text-primary hover:text-primary"
                                            onClick={() => setSelectedAuditId(log._id)}
                                        >
                                            <Eye className="h-3.5 w-3.5 mr-1" />
                                            View
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination and Zone Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground px-1">
                <div>
                    Showing page <span className="font-medium text-foreground">{page}</span> of{" "}
                    <span className="font-medium text-foreground">{totalPages}</span> (
                    <span className="font-medium text-foreground">{totalLogs}</span> total events)
                    <span className="ml-2 pl-2 border-l">Viewer zone: <span className="font-medium text-foreground">{getViewerTimeZone()}</span></span>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        disabled={!hasPrev || isLoading}
                        onClick={() => onPageChange(page - 1)}
                    >
                        <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        disabled={!hasNext || isLoading}
                        onClick={() => onPageChange(page + 1)}
                    >
                        Next
                        <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                </div>
            </div>

            <AuditDetailDrawer
                auditId={selectedAuditId}
                open={!!selectedAuditId}
                onOpenChange={(isOpen) => {
                    if (!isOpen) setSelectedAuditId(null);
                }}
            />
        </div>
    );
}
