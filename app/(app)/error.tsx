"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, LayoutDashboard, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function AppRouteError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const isDev = process.env.NODE_ENV !== "production";

    useEffect(() => {
        if (isDev) {
            console.error("Authenticated area caught error:", error);
        } else {
            console.error("Authenticated area caught error with digest:", error.digest || "unknown");
        }
    }, [error, isDev]);

    return (
        <div className="flex min-h-[60vh] items-center justify-center p-4">
            <Card className="max-w-md w-full border-destructive/30 shadow-md text-center">
                <CardHeader className="pb-2">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-2">
                        <AlertCircle className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-lg font-bold">Failed to load content</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-1">
                        An error occurred while rendering this page or fetching its data.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                    <div className="rounded-lg bg-muted/40 p-3 text-xs font-mono text-muted-foreground break-all border text-left">
                        {isDev
                            ? error.message || "An unexpected runtime error occurred."
                            : "An unexpected error occurred. Please try again."}
                        {!isDev && error.digest && (
                            <div className="mt-1 text-[11px] opacity-75">
                                Error reference: {error.digest}
                            </div>
                        )}
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                    <Button
                        type="button"
                        variant="default"
                        size="sm"
                        className="w-full sm:w-auto flex-1 gap-1.5 text-xs"
                        onClick={() => reset()}
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Retry
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        asChild
                        className="w-full sm:w-auto flex-1 gap-1.5 text-xs"
                    >
                        <Link href="/dashboard">
                            <LayoutDashboard className="h-3.5 w-3.5" />
                            Dashboard
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
