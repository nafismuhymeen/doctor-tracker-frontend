import React from "react";
import Link from "next/link";
import { Compass, Home, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground">
            <Card className="max-w-md w-full border shadow-lg text-center">
                <CardHeader className="pb-2">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2 shadow-xs">
                        <Compass className="h-7 w-7" />
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight">404 - Page Not Found</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-1">
                        The page or resource you are looking for doesn&apos;t exist or has been moved.
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground pt-2">
                    Please check the URL in the address bar or use the navigation buttons below to return.
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
                            <Home className="h-3.5 w-3.5" />
                            To Dashboard
                        </Link>
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        asChild
                        className="w-full sm:w-auto flex-1 gap-1.5 text-xs"
                    >
                        <Link href="/login">
                            <LogIn className="h-3.5 w-3.5" />
                            Sign In
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
