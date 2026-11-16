"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Activity,
    AlertCircle,
    Calendar,
    Globe,
    Info,
    Lock,
    Server,
    Shield,
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AuditDiffViewer } from "@/components/audit/audit-diff-viewer";
import type { ApiResponse, AuditLog } from "@/types";

interface AuditDetailDrawerProps {
    auditId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AuditDetailDrawer({
    auditId,
    open,
    onOpenChange,
}: AuditDetailDrawerProps) {
    const { data, isLoading, error } = useQuery({
        queryKey: qk.audit.detail(auditId ?? ""),
        queryFn: () =>
            api.get<ApiResponse<{ log: AuditLog }>>(`/audit/${auditId}`),
        enabled: !!auditId && open,
    });

    const log = data?.data?.log;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader className="border-b pb-4">
                    <div className="flex items-center justify-between gap-2 pr-6">
                        <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                            <Activity className="h-5 w-5 text-primary" />
                            Audit Log Details
                        </DialogTitle>
                        {log && (
                            <Badge
                                variant={log.outcome === "success" ? "outline" : "destructive"}
                                className={
                                    log.outcome === "success"
                                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                                        : ""
                                }
                            >
                                {log.outcome.toUpperCase()}
                            </Badge>
                        )}
                    </div>
                    <DialogDescription className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                        <Lock className="h-3.5 w-3.5" />
                        Audit logs are immutable and append-only.
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="space-y-4 py-4">
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-32 w-full" />
                    </div>
                ) : error ? (
                    <div className="py-8 text-center space-y-2">
                        <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
                        <p className="text-sm font-medium text-destructive">
                            Failed to load audit log details
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {(error as Error)?.message || "Audit record not found or inaccessible."}
                        </p>
                    </div>
                ) : log ? (
                    <div className="space-y-6 py-2">
                        {/* Summary Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                            <div className="p-3 rounded-lg border bg-muted/20 space-y-2">
                                <div className="font-semibold text-muted-foreground flex items-center gap-1.5">
                                    <Activity className="h-3.5 w-3.5" />
                                    Action & Timestamp
                                </div>
                                <div className="space-y-1">
                                    <div className="font-mono font-medium text-foreground text-sm">
                                        {log.action}
                                    </div>
                                    <div className="text-muted-foreground flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        <span>{formatViewerDateTime(log.createdAt)}</span>
                                    </div>
                                    <div className="text-[11px] text-muted-foreground">
                                        Viewer zone: {getViewerTimeZone()}
                                    </div>
                                </div>
                            </div>

                            <div className="p-3 rounded-lg border bg-muted/20 space-y-2">
                                <div className="font-semibold text-muted-foreground flex items-center gap-1.5">
                                    <User className="h-3.5 w-3.5" />
                                    Actor
                                </div>
                                <div className="space-y-1">
                                    <div className="font-medium text-foreground">
                                        {log.actorEmail || (
                                            <span className="text-muted-foreground italic">Anonymous / System</span>
                                        )}
                                    </div>
                                    {log.actorRole && (
                                        <div>
                                            <Badge variant="secondary" className="text-[10px] uppercase">
                                                {log.actorRole}
                                            </Badge>
                                        </div>
                                    )}
                                    {log.actorId && (
                                        <div className="font-mono text-[11px] text-muted-foreground break-all">
                                            ID: {log.actorId}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-3 rounded-lg border bg-muted/20 space-y-2">
                                <div className="font-semibold text-muted-foreground flex items-center gap-1.5">
                                    <Shield className="h-3.5 w-3.5" />
                                    Target Entity
                                </div>
                                <div className="space-y-1">
                                    <div className="font-medium text-foreground">
                                        {log.entityType || <span className="text-muted-foreground italic">None</span>}
                                    </div>
                                    {log.entityId && (
                                        <div className="font-mono text-[11px] text-muted-foreground break-all">
                                            ID: {log.entityId}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-3 rounded-lg border bg-muted/20 space-y-2">
                                <div className="font-semibold text-muted-foreground flex items-center gap-1.5">
                                    <Globe className="h-3.5 w-3.5" />
                                    Network & Request
                                </div>
                                <div className="space-y-1">
                                    <div className="font-mono text-[11px] text-foreground">
                                        IP: {log.metadata?.ip || "—"}
                                    </div>
                                    {log.metadata?.requestId && (
                                        <div className="font-mono text-[11px] text-muted-foreground break-all">
                                            Req: {log.metadata.requestId}
                                        </div>
                                    )}
                                    {log.metadata?.userAgent && (
                                        <div className="text-[10px] text-muted-foreground truncate" title={log.metadata.userAgent}>
                                            UA: {log.metadata.userAgent}
                                        </div>
                                    )}
                                    {log.metadata?.reason && (
                                        <div className="text-destructive font-medium text-[11px] break-words">
                                            Reason: {log.metadata.reason}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Diff Section */}
                        <div className="space-y-2">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <Server className="h-3.5 w-3.5" />
                                State Changes & Differences
                            </h4>
                            <AuditDiffViewer changes={log.changes} />
                        </div>

                        {/* Security notice */}
                        <div className="p-3 rounded-lg border bg-primary/5 border-primary/10 flex items-start gap-2 text-xs text-muted-foreground">
                            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <span>
                                Clinical content (notes, diagnoses, chief complaints) is never logged in audit trails.
                                PII fields such as phone and email are permanently redacted.
                            </span>
                        </div>
                    </div>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
