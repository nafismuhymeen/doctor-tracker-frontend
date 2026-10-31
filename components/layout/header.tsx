"use client";

import { useState } from "react";
import { Menu, LogOut, UserCircle } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
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

export function Header() {
    const { admin, logout } = useAuth();
    const [mobileOpen, setMobileOpen] = useState(false);

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

            {/* Empty spacer on desktop */}
            <div className="hidden md:block" />

            {/* Right side controls */}
            <div className="flex items-center gap-2 sm:gap-4">
                <ThemeToggle />

                {admin && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                className="flex items-center gap-2.5 rounded-full pl-2 pr-3 h-9"
                            >
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs uppercase">
                                    {admin.name ? admin.name.charAt(0) : "A"}
                                </div>
                                <span className="text-sm font-medium hidden sm:inline-block max-w-[120px] truncate">
                                    {admin.name}
                                </span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>
                                <p className="font-medium">{admin.name}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                    {admin.email}
                                </p>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => logout()}
                                className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Sign out</span>
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
        </header>
    );
}

