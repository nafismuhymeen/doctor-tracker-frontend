"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    CalendarClock,
    Plus,
    Trash2,
    Clock,
    Globe,
    Loader2,
    Sparkles,
    Search,
    Check,
    ChevronsUpDown,
} from "lucide-react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import {
    scheduleFormSchema,
    type ScheduleFormData,
    COMMON_TIMEZONES,
    DAY_NAMES,
} from "@/lib/schedule-validation";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { WorkingHours } from "@/types";

function getAvailableTimezones(currentTimezone?: string): string[] {
    const list: string[] = [];
    if (typeof Intl !== "undefined" && typeof Intl.supportedValuesOf === "function") {
        try {
            list.push(...Intl.supportedValuesOf("timeZone"));
        } catch {
            list.push(...COMMON_TIMEZONES);
        }
    } else {
        list.push(...COMMON_TIMEZONES);
    }
    if (currentTimezone && !list.includes(currentTimezone)) {
        list.unshift(currentTimezone);
    }
    return Array.from(new Set(list));
}

function getSlotMinuteOptions(currentSlot?: number): number[] {
    const multiplesOfFive: number[] = [];
    for (let m = 10; m <= 120; m += 5) {
        multiplesOfFive.push(m);
    }
    if (currentSlot && !multiplesOfFive.includes(currentSlot)) {
        multiplesOfFive.push(currentSlot);
    }
    return Array.from(new Set(multiplesOfFive)).sort((a, b) => a - b);
}

interface ScheduleEditorDialogProps {
    doctorId: string;
    doctorName: string;
    initialTimezone?: string;
    initialSlotMinutes?: number;
    initialWorkingHours?: WorkingHours[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const EMPTY_WORKING_HOURS: WorkingHours[] = [];

export function ScheduleEditorDialog({
    doctorId,
    doctorName,
    initialTimezone = "Asia/Dhaka",
    initialSlotMinutes = 30,
    initialWorkingHours = EMPTY_WORKING_HOURS,
    open,
    onOpenChange,
}: ScheduleEditorDialogProps) {
    const queryClient = useQueryClient();

    const {
        register,
        control,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors },
    } = useForm<ScheduleFormData>({
        resolver: zodResolver(scheduleFormSchema),
        defaultValues: {
            timezone: initialTimezone,
            slotMinutes: initialSlotMinutes,
            workingHours: initialWorkingHours,
        },
    });

    const { fields, append, remove, replace } = useFieldArray({
        control,
        name: "workingHours",
    });

    const [tzSearch, setTzSearch] = useState("");
    const [tzOpen, setTzOpen] = useState(false);

    const allTimezones = useMemo(
        () => getAvailableTimezones(initialTimezone),
        [initialTimezone]
    );

    const filteredTimezones = useMemo(() => {
        if (!tzSearch.trim()) return allTimezones;
        const q = tzSearch.toLowerCase();
        return allTimezones.filter((tz) => tz.toLowerCase().includes(q));
    }, [allTimezones, tzSearch]);

    const slotOptions = useMemo(
        () => getSlotMinuteOptions(initialSlotMinutes),
        [initialSlotMinutes]
    );

    const currentSlotMinutes = watch("slotMinutes");
    const currentTimezone = watch("timezone");

    useEffect(() => {
        if (open) {
            reset({
                timezone: initialTimezone || "Asia/Dhaka",
                slotMinutes: initialSlotMinutes || 30,
                workingHours: initialWorkingHours || [],
            });
            setTzSearch("");
        }
    }, [open, initialTimezone, initialSlotMinutes, initialWorkingHours, reset]);

    const updateScheduleMutation = useMutation({
        mutationFn: async (data: ScheduleFormData) => {
            return api.patch(`/doctors/${doctorId}`, {
                timezone: data.timezone,
                slotMinutes: data.slotMinutes,
                workingHours: data.workingHours,
            });
        },
        onSuccess: () => {
            toast.success("Schedule updated successfully", {
                description: `Working hours and slot intervals saved for Dr. ${doctorName}.`,
            });
            queryClient.invalidateQueries({ queryKey: qk.doctors.detail(doctorId) });
            queryClient.invalidateQueries({ queryKey: qk.doctors.all() });
            onOpenChange(false);
        },
        onError: (err: unknown) => {
            if (err instanceof ApiError) {
                toast.error("Schedule Update Failed", { description: err.message });
            } else {
                toast.error("Schedule Update Failed", {
                    description: "An unexpected error occurred while saving the schedule.",
                });
            }
        },
    });

    const handleApplySunThuHours = () => {
        // Sunday (0) through Thursday (4) from 09:00 to 17:00
        const sunThuHours: WorkingHours[] = [
            { dayOfWeek: 0, start: "09:00", end: "17:00" },
            { dayOfWeek: 1, start: "09:00", end: "17:00" },
            { dayOfWeek: 2, start: "09:00", end: "17:00" },
            { dayOfWeek: 3, start: "09:00", end: "17:00" },
            { dayOfWeek: 4, start: "09:00", end: "17:00" },
        ];
        replace(sunThuHours);
    };

    const handleApplyMonFriHours = () => {
        // Monday (1) through Friday (5) from 09:00 to 17:00
        const monFriHours: WorkingHours[] = [
            { dayOfWeek: 1, start: "09:00", end: "17:00" },
            { dayOfWeek: 2, start: "09:00", end: "17:00" },
            { dayOfWeek: 3, start: "09:00", end: "17:00" },
            { dayOfWeek: 4, start: "09:00", end: "17:00" },
            { dayOfWeek: 5, start: "09:00", end: "17:00" },
        ];
        replace(monFriHours);
    };

    const onSubmit = (data: ScheduleFormData) => {
        updateScheduleMutation.mutate(data);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader className="border-b pb-3">
                    <DialogTitle className="flex items-center gap-2">
                        <CalendarClock className="h-5 w-5 text-primary" />
                        Edit Clinical Schedule
                    </DialogTitle>
                    <DialogDescription>
                        Configure practice timezone, appointment slot length, and weekly availability for Dr. {doctorName}.
                    </DialogDescription>
                </DialogHeader>

                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="flex-1 overflow-y-auto space-y-5 py-3 pr-1"
                >
                    {/* Timezone and Slot Length */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border bg-muted/20 p-4">
                        {/* Timezone */}
                        <div className="space-y-1.5">
                            <Label htmlFor="sched-tz" className="flex items-center gap-1.5 text-xs font-semibold">
                                <Globe className="h-3.5 w-3.5 text-primary" />
                                Practice Timezone *
                            </Label>
                            <Popover open={tzOpen} onOpenChange={setTzOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        id="sched-tz"
                                        type="button"
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={tzOpen}
                                        disabled={updateScheduleMutation.isPending}
                                        className="w-full justify-between bg-background text-xs font-normal h-9"
                                    >
                                        <span className="truncate">{currentTimezone || "Select timezone"}</span>
                                        <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-2" align="start">
                                    <div className="relative mb-2">
                                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                        <Input
                                            placeholder="Search timezone..."
                                            value={tzSearch}
                                            onChange={(e) => setTzSearch(e.target.value)}
                                            className="h-8 text-xs pl-8"
                                        />
                                    </div>
                                    <div className="max-h-56 overflow-y-auto space-y-0.5">
                                        {filteredTimezones.length === 0 ? (
                                            <p className="text-xs text-muted-foreground text-center py-3">
                                                No timezone found.
                                            </p>
                                        ) : (
                                            filteredTimezones.map((tz) => (
                                                <button
                                                    key={tz}
                                                    type="button"
                                                    className={cn(
                                                        "w-full text-left text-xs px-2.5 py-1.5 rounded-sm hover:bg-muted flex items-center justify-between transition-colors",
                                                        tz === currentTimezone && "bg-primary/10 text-primary font-medium"
                                                    )}
                                                    onClick={() => {
                                                        setValue("timezone", tz, { shouldValidate: true });
                                                        setTzOpen(false);
                                                        setTzSearch("");
                                                    }}
                                                >
                                                    <span className="truncate">{tz}</span>
                                                    {tz === currentTimezone && (
                                                        <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-1" />
                                                    )}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </PopoverContent>
                            </Popover>
                            {errors.timezone && (
                                <p className="text-xs text-destructive">
                                    {errors.timezone.message}
                                </p>
                            )}
                        </div>

                        {/* Slot Length */}
                        <div className="space-y-1.5">
                            <Label htmlFor="sched-slot" className="flex items-center gap-1.5 text-xs font-semibold">
                                <Clock className="h-3.5 w-3.5 text-primary" />
                                Appointment Slot Duration *
                            </Label>
                            <Select
                                value={String(currentSlotMinutes)}
                                onValueChange={(val) =>
                                    setValue("slotMinutes", Number(val), { shouldValidate: true })
                                }
                                disabled={updateScheduleMutation.isPending}
                            >
                                <SelectTrigger id="sched-slot" className="bg-background text-xs">
                                    <SelectValue placeholder="Select duration" />
                                </SelectTrigger>
                                <SelectContent>
                                    {slotOptions.map((mins) => (
                                        <SelectItem key={mins} value={String(mins)} className="text-xs">
                                            {mins} minutes
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.slotMinutes && (
                                <p className="text-xs text-destructive">
                                    {errors.slotMinutes.message}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Working Hours Section */}
                    <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
                            <div>
                                <h3 className="text-sm font-semibold text-foreground">
                                    Working Hour Intervals
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Define active consultation shifts. All shifts must align to the {currentSlotMinutes}-minute slot length.
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleApplySunThuHours}
                                    className="h-8 text-xs gap-1 border-dashed"
                                    disabled={updateScheduleMutation.isPending}
                                >
                                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                                    Sun–Thu 9–5
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleApplyMonFriHours}
                                    className="h-8 text-xs gap-1 border-dashed"
                                    disabled={updateScheduleMutation.isPending}
                                >
                                    <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                                    Mon–Fri 9–5
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={() =>
                                        append({
                                            dayOfWeek: 1,
                                            start: "09:00",
                                            end: "17:00",
                                        })
                                    }
                                    className="h-8 text-xs gap-1"
                                    disabled={updateScheduleMutation.isPending || fields.length >= 28}
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add Shift
                                </Button>
                            </div>
                        </div>

                        {errors.workingHours && (
                            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
                                {errors.workingHours.message}
                            </div>
                        )}

                        {fields.length === 0 ? (
                            <div className="text-center py-8 border rounded-lg border-dashed">
                                <CalendarClock className="mx-auto h-8 w-8 text-muted-foreground/60" />
                                <p className="mt-2 text-xs font-medium">No working hours scheduled</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                    Add shifts or apply the standard Mon–Fri preset.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                                {fields.map((field, index) => (
                                    <div
                                        key={field.id}
                                        className="flex flex-col sm:flex-row sm:items-center gap-2.5 p-3 rounded-lg border bg-card shadow-xs"
                                    >
                                        {/* Day of Week */}
                                        <div className="w-full sm:w-44">
                                            <Label className="text-[10px] text-muted-foreground block mb-1">
                                                Day of Week
                                            </Label>
                                            <Select
                                                value={String(watch(`workingHours.${index}.dayOfWeek`))}
                                                onValueChange={(val) =>
                                                    setValue(
                                                        `workingHours.${index}.dayOfWeek`,
                                                        Number(val),
                                                        { shouldValidate: true }
                                                    )
                                                }
                                                disabled={updateScheduleMutation.isPending}
                                            >
                                                <SelectTrigger className="h-8 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {DAY_NAMES.map((name, dayIndex) => (
                                                        <SelectItem
                                                            key={dayIndex}
                                                            value={String(dayIndex)}
                                                            className="text-xs"
                                                        >
                                                            {name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Start Time */}
                                        <div className="w-full sm:w-32">
                                            <Label className="text-[10px] text-muted-foreground block mb-1">
                                                Start Time (HH:mm)
                                            </Label>
                                            <Input
                                                type="time"
                                                className="h-8 text-xs font-mono"
                                                disabled={updateScheduleMutation.isPending}
                                                {...register(`workingHours.${index}.start`)}
                                            />
                                        </div>

                                        {/* End Time */}
                                        <div className="w-full sm:w-32">
                                            <Label className="text-[10px] text-muted-foreground block mb-1">
                                                End Time (HH:mm)
                                            </Label>
                                            <Input
                                                type="time"
                                                className="h-8 text-xs font-mono"
                                                disabled={updateScheduleMutation.isPending}
                                                {...register(`workingHours.${index}.end`)}
                                            />
                                        </div>

                                        {/* Remove Action */}
                                        <div className="flex sm:self-end pt-1 sm:pt-0">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                onClick={() => remove(index)}
                                                disabled={updateScheduleMutation.isPending}
                                                aria-label="Remove shift"
                                                title="Remove shift"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="pt-2 border-t mt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={updateScheduleMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={updateScheduleMutation.isPending}>
                            {updateScheduleMutation.isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Save Schedule
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
