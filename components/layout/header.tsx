"use client";

import { useState } from "react";
import {
    Menu,
    LogOut,
    KeyRound,
    ShieldAlert,
    Search,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Sidebar } from "./sidebar";
import { ChangePasswordDialog } from "@/components/auth/change-password-dialog";
import type { Role } from "@/types";

const roleBadgeVariant: Record<
    Role,
    { label: string; className: string }
> = {
    admin: {
        label: "Admin",
        className: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    },
    staff: {
        label: "Staff",
        className: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    },
    doctor: {
        label: "Doctor",
        className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    },
    viewer: {
        label: "Viewer",
        className: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800",
    },
};

export function Header() {
    const { user, role, logout, logoutAll } = useAuth();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [changePasswordOpen, setChangePasswordOpen] = useState(false);

    const roleInfo = role
        ? roleBadgeVariant[role]
        : { label: "User", className: "bg-muted text-muted-foreground" };

    return (
        <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b bg-background/80 px-4 sm:px-6 backdrop-blur-md">
            {/* Mobile menu trigger */}
            <div className="flex items-center gap-3 md:hidden">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setMobileOpen(true)}
                    className="h-9 w-9"
                >
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Open navigation menu</span>
                </Button>
                <span className="font-semibold text-sm">Doctor Tracker</span>
            </div>

            {/* Center / Command Palette Search Trigger */}
            <div className="flex-1 max-w-sm mx-2 sm:mx-4 hidden sm:block">
                <button
                    type="button"
                    onClick={() => {
                        window.dispatchEvent(
                            new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true })
                        );
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors shadow-2xs"
                >
                    <span className="flex items-center gap-2">
                        <Search className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Search or jump to...</span>
                    </span>
                    <kbd className="inline-flex items-center gap-0.5 rounded border bg-background px-1.5 py-0.5 text-[10px] font-mono shadow-xs">
                        ⌘K
                    </kbd>
                </button>
            </div>

            {/* Right side controls */}
            <div className="flex items-center gap-2 sm:gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                        window.dispatchEvent(
                            new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true })
                        );
                    }}
                    className="h-9 w-9 sm:hidden text-muted-foreground hover:text-foreground"
                    aria-label="Open command palette"
                >
                    <Search className="h-4 w-4" />
                </Button>

                <ThemeToggle />

                {user && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                className="flex items-center gap-2.5 rounded-full pl-2 pr-3 h-9"
                            >
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs uppercase">
                                    {user.name ? user.name.charAt(0) : "U"}
                                </div>
                                <span className="text-sm font-medium hidden sm:inline-block max-w-[120px] truncate">
                                    {user.name}
                                </span>
                                <Badge
                                    variant="outline"
                                    className={`hidden sm:inline-flex text-[10px] px-1.5 py-0 font-semibold uppercase ${roleInfo.className}`}
                                >
                                    {roleInfo.label}
                                </Badge>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-60">
                            <DropdownMenuLabel>
                                <div className="flex items-center justify-between gap-2">
                                    <p className="font-medium truncate">{user.name}</p>
                                    <Badge
                                        variant="outline"
                                        className={`text-[10px] px-1.5 py-0 font-semibold uppercase ${roleInfo.className}`}
                                    >
                                        {roleInfo.label}
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground truncate font-normal">
                                    {user.email}
                                </p>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => setChangePasswordOpen(true)}
                                className="cursor-pointer"
                            >
                                <KeyRound className="mr-2 h-4 w-4" />
                                <span>Change password</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => logout()}
                                className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Sign out</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => logoutAll()}
                                className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer text-xs"
                            >
                                <ShieldAlert className="mr-2 h-4 w-4" />
                                <span>Sign out of all devices</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            {/* Mobile Drawer */}
            <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
                <DialogContent className="p-0 max-w-[280px] h-full rounded-none border-r fixed left-0 top-0 translate-x-0 translate-y-0 duration-200">
                    <DialogTitle className="sr-only">Navigation</DialogTitle>
                    <Sidebar onItemClick={() => setMobileOpen(false)} />
                </DialogContent>
            </Dialog>

            {/* Change Password Dialog */}
            <ChangePasswordDialog
                open={changePasswordOpen}
                onOpenChange={setChangePasswordOpen}
            />
        </header>
    );
}
