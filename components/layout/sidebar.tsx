"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Activity,
    LayoutDashboard,
    Stethoscope,
    Users,
    HeartPulse,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigationItems = [
    {
        name: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
    },
    {
        name: "Doctors",
        href: "/doctors",
        icon: Stethoscope,
    },
    {
        name: "Patients",
        href: "/patients",
        icon: Users,
    },
];

interface SidebarProps {
    className?: string;
    onItemClick?: () => void;
}

export function Sidebar({ className, onItemClick }: SidebarProps) {
    const pathname = usePathname();

    return (
        <aside
            className={cn(
                "flex h-full flex-col border-r bg-card/60 backdrop-blur-xl",
                className
            )}
        >
            {/* Brand Logo & Name */}
            <div className="flex h-16 items-center gap-3 border-b px-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-md shadow-blue-500/20">
                    <HeartPulse className="h-6 w-6 animate-pulse" />
                </div>
                <div>
                    <h1 className="text-base font-bold tracking-tight">
                        Doctor Tracker
                    </h1>
                    <p className="text-xs text-muted-foreground">Admin Portal</p>
                </div>
            </div>

            {/* Navigation links */}
            <div className="flex-1 space-y-1 p-4">
                <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                    Navigation
                </p>
                {navigationItems.map((item) => {
                    const isActive =
                        pathname === item.href ||
                        (item.href !== "/dashboard" &&
                            pathname.startsWith(item.href));
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            onClick={onItemClick}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                                isActive
                                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25 font-semibold"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                        >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span>{item.name}</span>
                        </Link>
                    );
                })}
            </div>

            {/* System Status footer */}
            <div className="border-t p-4">
                <div className="flex items-center gap-3 rounded-lg bg-muted/60 p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                        <Activity className="h-4 w-4" />
                    </div>
                    <div className="text-xs">
                        <p className="font-medium text-foreground">API Status</p>
                        <p className="text-muted-foreground">Operational</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}

