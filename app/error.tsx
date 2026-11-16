"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, Home, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function RootError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log to telemetry or error reporting service if configured
        console.error("Root error boundary caught error:", error);
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground">
            <Card className="max-w-md w-full border-destructive/30 shadow-lg">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-2">
                        <AlertCircle className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl font-bold">Something went wrong</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-1">
                        An unexpected application error occurred. We apologize for the inconvenience.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-2">
                    <div className="rounded-lg bg-muted/50 p-3 text-xs font-mono text-muted-foreground break-all border">
                        {error.message || "An unexpected runtime error occurred."}
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                    <Button
                        type="button"
                        variant="default"
                        size="sm"
                        className="w-full sm:w-auto flex-1 gap-1.5 text-xs"
                        onClick={() => reset()}
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Try again
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        asChild
                        className="w-full sm:w-auto flex-1 gap-1.5 text-xs"
                    >
                        <Link href="/">
                            <Home className="h-3.5 w-3.5" />
                            Return Home
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
