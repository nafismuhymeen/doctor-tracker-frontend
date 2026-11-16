"use client";

import React from "react";
import { ArrowRight, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AuditLogChange } from "@/types";

interface AuditDiffViewerProps {
    changes?: AuditLogChange[];
}

function renderValue(val: unknown): React.ReactNode {
    if (val === "[redacted]") {
        return (
            <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 cursor-help"
                title="PII is not stored in the audit log"
            >
                <ShieldAlert className="h-3 w-3" />
                Redacted
            </span>
        );
    }

    if (val === null || val === undefined || val === "") {
        return <span className="text-muted-foreground italic text-xs">none</span>;
    }

    if (typeof val === "boolean") {
        return (
            <Badge variant="outline" className="text-[11px] font-mono">
                {String(val)}
            </Badge>
        );
    }

    if (typeof val === "object") {
        try {
            return (
                <pre className="text-[11px] font-mono bg-muted/50 p-2 rounded max-h-32 overflow-x-auto whitespace-pre-wrap break-all">
                    {JSON.stringify(val, null, 2)}
                </pre>
            );
        } catch {
            return <span className="text-xs font-mono break-all">{String(val)}</span>;
        }
    }

    return (
        <span className="text-xs font-mono break-all text-foreground">
            {String(val)}
        </span>
    );
}

export function AuditDiffViewer({ changes }: AuditDiffViewerProps) {
    if (!changes || changes.length === 0) {
        return (
            <p className="text-xs text-muted-foreground italic py-2">
                No recorded field changes for this action.
            </p>
        );
    }

    return (
        <div className="space-y-3">
            {changes.map((change, idx) => (
                <div
                    key={idx}
                    className="rounded-lg border bg-card p-3 space-y-2 text-xs"
                >
                    <div className="font-semibold text-foreground flex items-center justify-between">
                        <span className="font-mono text-primary text-[11px]">
                            {change.field}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-11 gap-2 items-center bg-muted/30 p-2 rounded-md">
                        <div className="sm:col-span-5 min-w-0">
                            <span className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">
                                Previous Value
                            </span>
                            <div className="min-w-0">{renderValue(change.from)}</div>
                        </div>

                        <div className="sm:col-span-1 flex justify-center py-1 sm:py-0">
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>

                        <div className="sm:col-span-5 min-w-0">
                            <span className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">
                                New Value
                            </span>
                            <div className="min-w-0">{renderValue(change.to)}</div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

