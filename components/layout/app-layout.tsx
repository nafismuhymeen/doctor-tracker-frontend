"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export function AppLayout({ children }: { children: React.ReactNode }) {
    const { isLoading, admin } = useAuth();

    if (isLoading) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-sm font-medium text-muted-foreground animate-pulse">
                        Loading Doctor Tracker...
                    </p>
                </div>
            </div>
        );
    }

    if (!admin) {
        return null;
    }

    return (
        <div className="flex min-h-screen bg-muted/20 overflow-x-hidden">
            {/* Desktop fixed sidebar */}
            <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30">
                <Sidebar />
            </div>

            {/* Main content column */}
            <div className="flex flex-1 flex-col md:pl-64 min-w-0 max-w-full">
                <Header />
                <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto min-w-0">
                    {children}
                </main>
            </div>
        </div>
    );
}

