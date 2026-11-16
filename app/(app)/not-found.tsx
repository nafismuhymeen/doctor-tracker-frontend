import React from "react";
import Link from "next/link";
import { FileQuestion, LayoutDashboard, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function AppNotFound() {
    return (
        <div className="flex min-h-[60vh] items-center justify-center p-4">
            <Card className="max-w-md w-full border shadow-md text-center">
                <CardHeader className="pb-2">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2 shadow-xs">
                        <FileQuestion className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-lg font-bold">Resource Not Found</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-1">
                        The requested record, patient, doctor, or view does not exist or you do not have permission to view it.
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground pt-2">
                    Please ensure the ID in the URL is correct and that you have the appropriate permissions.
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                    <Button
                        type="button"
                        variant="default"
                        size="sm"
                        asChild
                        className="w-full sm:w-auto flex-1 gap-1.5 text-xs"
                    >
                        <Link href="/dashboard">
                            <LayoutDashboard className="h-3.5 w-3.5" />
                            Return to Dashboard
                        </Link>
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        asChild
                        className="w-full sm:w-auto flex-1 gap-1.5 text-xs"
                    >
                        <Link href="/appointments">
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Appointments
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

