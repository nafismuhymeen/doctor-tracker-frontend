"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const isDev = process.env.NODE_ENV !== "production";

    useEffect(() => {
        if (isDev) {
            console.error("Global error caught:", error);
        } else {
            console.error("Global error caught with digest:", error.digest || "unknown");
        }
    }, [error, isDev]);

    return (
        <html lang="en">
            <body className="min-h-screen flex items-center justify-center p-4 bg-gray-50 text-gray-900 font-sans antialiased">
                <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-red-200 p-6 text-center space-y-4">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                        <AlertTriangle className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-xl font-bold tracking-tight">Critical System Error</h1>
                        <p className="text-xs text-gray-500">
                            The application failed to initialize properly.
                        </p>
                    </div>
                    <div className="rounded-lg bg-gray-100 p-3 text-xs font-mono text-gray-600 break-all text-left">
                        {isDev
                            ? error.message || "A fatal layout or initialization error occurred."
                            : "A critical system error occurred. Please reload the application."}
                        {!isDev && error.digest && (
                            <div className="mt-1 text-[11px] text-gray-400">
                                Error reference: {error.digest}
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => reset()}
                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reload Application
                    </button>
                </div>
            </body>
        </html>
    );
}
