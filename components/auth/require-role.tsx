"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { can as canPermission, type Action, type PermissionContext } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface RequireRoleProps {
    children: React.ReactNode;
    action?: Action;
    context?: PermissionContext;
}

export function RequireRole({ children, action, context }: RequireRoleProps) {
    const { user, role, isLoading, isAuthenticated } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            const nextParam = pathname ? `?next=${encodeURIComponent(pathname)}` : "";
            router.push(`/login${nextParam}`);
        }
    }, [isLoading, isAuthenticated, pathname, router]);

    if (isLoading) {
        return (
            <div className="flex h-64 w-full items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-sm font-medium text-muted-foreground animate-pulse">
                        Checking credentials...
                    </p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    if (action && !canPermission(role, action, { ...context, doctorId: user?.doctorId })) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center p-4">
                <Card className="max-w-md w-full border-destructive/20 text-center">
                    <CardContent className="pt-6 pb-6 space-y-4">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                            <ShieldAlert className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-lg font-semibold tracking-tight">Access Denied</h3>
                            <p className="text-sm text-muted-foreground">
                                Your account role (<span className="capitalize font-medium text-foreground">{role}</span>) does not have permission to view this resource.
                            </p>
                        </div>
                        <Button asChild variant="outline" size="sm">
                            <Link href="/dashboard">Return to Dashboard</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return <>{children}</>;
}

