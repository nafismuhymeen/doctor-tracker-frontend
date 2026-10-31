"use client";

import * as React from "react";
import { format, parse } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

export interface DatePickerProps {
    value?: string; // Format: "yyyy-MM-dd"
    onChange?: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export function DatePicker({
    value,
    onChange,
    placeholder = "Pick a date",
    className,
    disabled = false,
}: DatePickerProps) {
    const [open, setOpen] = React.useState(false);

    const selectedDate = React.useMemo(() => {
        if (!value) return undefined;
        try {
            const parsed = parse(value, "yyyy-MM-dd", new Date());
            return isNaN(parsed.getTime()) ? undefined : parsed;
        } catch {
            return undefined;
        }
    }, [value]);

    const handleSelect = (date: Date | undefined) => {
        if (date) {
            onChange?.(format(date, "yyyy-MM-dd"));
        } else {
            onChange?.("");
        }
        setOpen(false);
    };

    const handleClear = (e?: React.SyntheticEvent) => {
        e?.stopPropagation();
        onChange?.("");
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    type="button"
                    disabled={disabled}
                    className={cn(
                        "w-full justify-start text-left font-normal h-9 px-3 text-xs gap-2 group",
                        !value && "text-muted-foreground",
                        className
                    )}
                >
                    <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
                    <span className="truncate flex-1">
                        {selectedDate
                            ? format(selectedDate, "MMM d, yyyy")
                            : placeholder}
                    </span>
                    {value && (
                        <span
                            role="button"
                            tabIndex={0}
                            onClick={handleClear}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    handleClear(e);
                                }
                            }}
                            className="rounded-full p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Clear date"
                        >
                            <X className="h-3 w-3" />
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleSelect}
                    autoFocus
                />
            </PopoverContent>
        </Popover>
    );
}
