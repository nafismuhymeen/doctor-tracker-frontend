"use client";

import React, { useState, useEffect } from "react";
import { RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_URL } from "@/lib/api";

export function OfflineBanner() {
    const [isOnline, setIsOnline] = useState<boolean>(() =>
        typeof window !== "undefined" ? window.navigator.onLine : true
    );
    const [isChecking, setIsChecking] = useState<boolean>(false);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    const checkConnection = async () => {
        setIsChecking(true);
        try {
            // Any HTTP response (including 401 Unauthorized) means the API endpoint is reachable.
            await fetch(`${API_URL}/auth/me`, { method: "HEAD", cache: "no-store" });
            setIsOnline(true);
        } catch {
            // Thrown fetch error (TypeError/network fail) indicates server is unreachable.
            setIsOnline(false);
        } finally {
            setIsChecking(false);
        }
    };

    if (isOnline) {
        return null;
    }

    return (
        <div
            role="status"
            aria-live="polite"
            className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-amber-500/90 dark:bg-amber-600/90 backdrop-blur-sm px-4 py-2 text-xs font-medium text-white shadow-md transition-all animate-in slide-in-from-top-2"
        >
            <div className="flex items-center gap-2 truncate">
                <WifiOff className="h-4 w-4 shrink-0 animate-pulse" />
                <span>
                    <strong>Offline mode:</strong> You are currently disconnected. Changes cannot be saved until network connectivity is restored.
                </span>
            </div>
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 px-2.5 text-[11px] bg-white/20 hover:bg-white/30 text-white border-white/40 shrink-0"
                onClick={checkConnection}
                disabled={isChecking}
            >
                <RefreshCw className={`h-3 w-3 mr-1 ${isChecking ? "animate-spin" : ""}`} />
                {isChecking ? "Checking..." : "Reconnect"}
            </Button>
        </div>
    );
}
