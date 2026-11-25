"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
    Activity,
    Calendar,
    CornerDownLeft,
    LayoutDashboard,
    Search,
    Stethoscope,
    UserCog,
    Users,
    X,
} from "lucide-react";
import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { useAuth } from "@/components/providers/auth-provider";
import { useDebounce } from "@/lib/hooks/use-debounce";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { ApiResponse, DoctorsResponse, PatientsResponse } from "@/types";

interface CommandItem {
    id: string;
    title: string;
    subtitle?: string;
    icon: React.ComponentType<{ className?: string }>;
    category: "Pages" | "Doctors" | "Patients" | "Actions";
    action: () => void;
}

interface CommandPaletteProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function CommandPalette({ open: controlledOpen, onOpenChange: setControlledOpen }: CommandPaletteProps = {}) {
    const [internalOpen, setInternalOpen] = useState(false);
    const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const setIsOpen = setControlledOpen || setInternalOpen;

    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [prevOpen, setPrevOpen] = useState(isOpen);
    if (prevOpen !== isOpen) {
        setPrevOpen(isOpen);
        if (isOpen) {
            setQuery("");
            setSelectedIndex(0);
        }
    }

    const debouncedQuery = useDebounce(query.trim(), 250);
    const router = useRouter();
    const { role, can } = useAuth();
    const inputRef = useRef<HTMLInputElement>(null);

    // Global Cmd/Ctrl+K keyboard shortcut
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                setIsOpen(!isOpen);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, setIsOpen]);

    // Live search doctors
    const { data: doctorsData, isLoading: isLoadingDoctors } = useQuery({
        queryKey: qk.doctors.list(`search=${encodeURIComponent(debouncedQuery)}&limit=5`),
        queryFn: () =>
            api.get<ApiResponse<DoctorsResponse>>(`/doctors?search=${encodeURIComponent(debouncedQuery)}&limit=5`),
        enabled: isOpen && debouncedQuery.length >= 2,
    });

    // Live search patients
    const { data: patientsData, isLoading: isLoadingPatients } = useQuery({
        queryKey: qk.patients.list(`search=${encodeURIComponent(debouncedQuery)}&limit=5`),
        queryFn: () =>
            api.get<ApiResponse<PatientsResponse>>(`/patients?search=${encodeURIComponent(debouncedQuery)}&limit=5`),
        enabled: isOpen && debouncedQuery.length >= 2,
    });

    const navigateTo = useCallback(
        (path: string) => {
            setIsOpen(false);
            router.push(path);
        },
        [router, setIsOpen]
    );

    // Build available command items
    const items: CommandItem[] = useMemo(() => {
        const result: CommandItem[] = [];
        const doctors = doctorsData?.data?.doctors ?? [];
        const patients = patientsData?.data?.patients ?? [];

        // 1. Core Pages (filtered by permissions)
        const pages: CommandItem[] = [
            {
                id: "nav-dashboard",
                title: "Dashboard",
                subtitle: "System metrics, activity, and overview",
                icon: LayoutDashboard,
                category: "Pages",
                action: () => navigateTo("/dashboard"),
            },
            {
                id: "nav-appointments",
                title: "Appointments Calendar",
                subtitle: "View and manage calendar schedules",
                icon: Calendar,
                category: "Pages",
                action: () => navigateTo("/appointments"),
            },
            {
                id: "nav-doctors",
                title: "Doctors Directory",
                subtitle: "Practitioner profiles and working hours",
                icon: Stethoscope,
                category: "Pages",
                action: () => navigateTo("/doctors"),
            },
            {
                id: "nav-patients",
                title: "Patients List",
                subtitle: "Patient clinical records and visits",
                icon: Users,
                category: "Pages",
                action: () => navigateTo("/patients"),
            },
        ];

        if (can("users.manage")) {
            pages.push({
                id: "nav-users",
                title: "User Management",
                subtitle: "System accounts, roles, and credentials",
                icon: UserCog,
                category: "Pages",
                action: () => navigateTo("/users"),
            });
        }

        if (can("audit.view")) {
            pages.push({
                id: "nav-audit",
                title: "Audit Logs",
                subtitle: "System security trail and clinical reads",
                icon: Activity,
                category: "Pages",
                action: () => navigateTo("/audit"),
            });
        }

        // Filter pages by query
        if (!debouncedQuery) {
            result.push(...pages);
        } else {
            const lowerQuery = debouncedQuery.toLowerCase();
            const matchingPages = pages.filter(
                (p) =>
                    p.title.toLowerCase().includes(lowerQuery) ||
                    (p.subtitle && p.subtitle.toLowerCase().includes(lowerQuery))
            );
            result.push(...matchingPages);
        }

        // 2. Doctor search results
        if (debouncedQuery.length >= 2) {
            doctors.forEach((doc) => {
                result.push({
                    id: `doc-${doc._id}`,
                    title: doc.name,
                    subtitle: `${doc.specialization} • ${doc.hospital}`,
                    icon: Stethoscope,
                    category: "Doctors",
                    action: () => navigateTo(`/doctors/${doc._id}`),
                });
            });

            // 3. Patient search results
            patients.forEach((pat) => {
                result.push({
                    id: `pat-${pat._id}`,
                    title: pat.name,
                    subtitle: `${pat.gender}, ${pat.age} yrs • Phone: ${pat.phone}`,
                    icon: Users,
                    category: "Patients",
                    action: () => navigateTo(`/patients/${pat._id}`),
                });
            });
        }

        return result;
    }, [debouncedQuery, doctorsData, patientsData, can, navigateTo]);

    const activeIndex = selectedIndex < items.length ? selectedIndex : 0;

    // Keyboard navigation within list
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex((prev) => (prev + 1 < items.length ? prev + 1 : 0));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : Math.max(0, items.length - 1)));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (items[activeIndex]) {
                items[activeIndex].action();
            }
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent
                className="p-0 overflow-hidden max-w-lg sm:max-w-xl gap-0 shadow-2xl border"
                onOpenAutoFocus={(e) => {
                    e.preventDefault();
                    inputRef.current?.focus();
                }}
            >
                <DialogHeader className="sr-only">
                    <DialogTitle>Quick Command Palette</DialogTitle>
                    <DialogDescription>
                        Navigate directly to pages, search doctors, or jump to patient records.
                    </DialogDescription>
                </DialogHeader>

                {/* Search Bar Input */}
                <div className="flex items-center gap-3 border-b px-4 py-3 bg-muted/20">
                    <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        role="combobox"
                        aria-expanded={isOpen}
                        aria-controls="command-list"
                        placeholder="Type a command or search doctors & patients..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-full bg-transparent text-sm font-medium placeholder:text-muted-foreground focus:outline-none"
                    />
                    {query && (
                        <button
                            type="button"
                            aria-label="Clear search"
                            onClick={() => setQuery("")}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                    <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground shadow-xs">
                        ESC
                    </kbd>
                </div>

                {/* Commands / Results List */}
                <div id="command-list" role="listbox" className="max-h-80 overflow-y-auto p-2 space-y-1">
                    {items.length === 0 ? (
                        <div className="py-8 text-center text-xs text-muted-foreground">
                            {isLoadingDoctors || isLoadingPatients ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                    <span>Searching records...</span>
                                </div>
                            ) : (
                                <span>No matching pages, doctors, or patients found.</span>
                            )}
                        </div>
                    ) : (
                        items.map((item, index) => {
                            const Icon = item.icon;
                            const isSelected = index === activeIndex;

                            return (
                                <div
                                    key={item.id}
                                    role="option"
                                    aria-selected={isSelected}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                    onClick={() => item.action()}
                                    className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                                        isSelected
                                            ? "bg-primary text-primary-foreground"
                                            : "hover:bg-muted text-foreground"
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 truncate">
                                        <div
                                            className={`p-1.5 rounded-md ${
                                                isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                                            }`}
                                        >
                                            <Icon className="h-3.5 w-3.5" />
                                        </div>
                                        <div className="truncate text-left">
                                            <div className="font-medium truncate">{item.title}</div>
                                            {item.subtitle && (
                                                <div
                                                    className={`text-[11px] truncate ${
                                                        isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                                                    }`}
                                                >
                                                    {item.subtitle}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <Badge
                                            variant="outline"
                                            className={`text-[10px] font-normal uppercase py-0 px-1.5 ${
                                                isSelected
                                                    ? "border-primary-foreground/30 text-primary-foreground"
                                                    : "text-muted-foreground"
                                            }`}
                                        >
                                            {item.category}
                                        </Badge>
                                        {isSelected && <CornerDownLeft className="h-3.5 w-3.5 opacity-80" />}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer Guide */}
                <div className="flex items-center justify-between border-t px-3 py-2 text-[11px] text-muted-foreground bg-muted/10">
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                            <kbd className="rounded border bg-muted px-1 text-[10px] font-mono">↑</kbd>
                            <kbd className="rounded border bg-muted px-1 text-[10px] font-mono">↓</kbd>
                            Navigate
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="rounded border bg-muted px-1 text-[10px] font-mono">↵</kbd>
                            Select
                        </span>
                    </div>
                    <span>
                        Role: <strong className="capitalize">{role || "Guest"}</strong>
                    </span>
                </div>
            </DialogContent>
        </Dialog>
    );
}
