"use client";

import { useMemo } from "react";
import {
    format,
    startOfWeek,
    addDays,
    isSameDay,
} from "date-fns";
import { TZDate } from "@date-fns/tz";
import { Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { parseMinutes, DAY_NAMES } from "@/lib/schedule-validation";
import type { Appointment, AppointmentStatus, Doctor, Patient } from "@/types";

interface AppointmentsCalendarProps {
    appointments: Appointment[];
    doctor: Doctor | null;
    view: "week" | "day";
    selectedDate: Date;
    onSelectAppointment: (appointment: Appointment) => void;
}

const HOUR_HEIGHT_PX = 80;

export function AppointmentsCalendar({
    appointments,
    doctor,
    view,
    selectedDate,
    onSelectAppointment,
}: AppointmentsCalendarProps) {
    const doctorTimezone = doctor?.timezone || "UTC";
    const workingHours = doctor?.workingHours;

    // Calculate time range for the vertical time axis
    const { startHour, endHour, earliestMinutes, totalMinutes } = useMemo(() => {
        let minMins = 8 * 60; // 08:00 default
        let maxMins = 18 * 60; // 18:00 default

        if (workingHours && workingHours.length > 0) {
            let foundMin = 24 * 60;
            let foundMax = 0;
            for (const shift of workingHours) {
                const s = parseMinutes(shift.start);
                const e = parseMinutes(shift.end);
                if (s < foundMin) foundMin = s;
                if (e > foundMax) foundMax = e;
            }
            if (foundMin < foundMax) {
                minMins = Math.floor(foundMin / 60) * 60;
                maxMins = Math.ceil(foundMax / 60) * 60;
            }
        }

        // Ensure at least 8 hours spread
        if (maxMins - minMins < 8 * 60) {
            maxMins = minMins + 8 * 60;
        }

        const sHour = Math.floor(minMins / 60);
        const eHour = Math.ceil(maxMins / 60);

        return {
            startHour: sHour,
            endHour: eHour,
            earliestMinutes: minMins,
            totalMinutes: maxMins - minMins,
        };
    }, [workingHours]);

    // Hours list for the Y axis
    const hours = useMemo(() => {
        const list: number[] = [];
        for (let h = startHour; h <= endHour; h++) {
            list.push(h);
        }
        return list;
    }, [startHour, endHour]);

    const calendarDate = useMemo(() => {
        if (selectedDate instanceof TZDate) return selectedDate;
        return new TZDate(
            selectedDate.getFullYear(),
            selectedDate.getMonth(),
            selectedDate.getDate(),
            doctorTimezone
        );
    }, [selectedDate, doctorTimezone]);

    const doctorToday = useMemo(() => {
        return new TZDate(new Date(), doctorTimezone);
    }, [doctorTimezone]);

    // Days list for the X axis
    const days = useMemo(() => {
        if (view === "day") {
            return [calendarDate];
        }
        // Sunday-start week in doctor's timezone
        const weekStart = startOfWeek(calendarDate, { weekStartsOn: 0 });
        return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    }, [view, calendarDate]);

    // Helper: extract doctor timezone hour and minute from appointment UTC ISO
    const getDoctorTimeInfo = (isoString: string) => {
        try {
            const date = new Date(isoString);
            const formatter = new Intl.DateTimeFormat("en-US", {
                timeZone: doctorTimezone,
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                hourCycle: "h23",
            });
            const parts = formatter.formatToParts(date);
            const h = Number(parts.find((p) => p.type === "hour")?.value || 0);
            const m = Number(parts.find((p) => p.type === "minute")?.value || 0);
            const y = Number(parts.find((p) => p.type === "year")?.value || 0);
            const mon = Number(parts.find((p) => p.type === "month")?.value || 0);
            const d = Number(parts.find((p) => p.type === "day")?.value || 0);

            const dateStr = `${y}-${String(mon).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            return {
                dateStr,
                totalMinutes: h * 60 + m,
                timeLabel: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
            };
        } catch {
            const date = new Date(isoString);
            return {
                dateStr: format(date, "yyyy-MM-dd"),
                totalMinutes: date.getHours() * 60 + date.getMinutes(),
                timeLabel: format(date, "HH:mm"),
            };
        }
    };

    const getStatusStyle = (status: AppointmentStatus) => {
        switch (status) {
            case "scheduled":
                return {
                    bg: "bg-blue-500/15 border-blue-500/40 text-blue-950 dark:text-blue-200 hover:bg-blue-500/25",
                    badge: "bg-blue-600 text-white",
                    icon: Clock,
                };
            case "completed":
                return {
                    bg: "bg-emerald-500/15 border-emerald-500/40 text-emerald-950 dark:text-emerald-200 hover:bg-emerald-500/25",
                    badge: "bg-emerald-600 text-white",
                    icon: CheckCircle2,
                };
            case "cancelled":
                return {
                    bg: "bg-rose-500/15 border-rose-500/40 text-rose-950 dark:text-rose-200 hover:bg-rose-500/25 line-through opacity-70",
                    badge: "bg-rose-600 text-white",
                    icon: XCircle,
                };
            case "no_show":
                return {
                    bg: "bg-amber-500/15 border-amber-500/40 text-amber-950 dark:text-amber-200 hover:bg-amber-500/25",
                    badge: "bg-amber-600 text-white",
                    icon: AlertCircle,
                };
        }
    };

    return (
        <div className="flex flex-col rounded-lg border bg-card shadow-xs overflow-hidden">
            {/* Calendar Meta Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-4 py-2.5 text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    Times shown in <span className="font-semibold text-foreground font-mono">{doctorTimezone}</span> (doctor&apos;s timezone)
                </span>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                        Scheduled
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Completed
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        No-Show
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-rose-500" />
                        Cancelled
                    </span>
                </div>
            </div>

            {/* Scrollable Grid Container */}
            <div className="overflow-x-auto min-w-[640px]">
                {/* Day Headers Row */}
                <div
                    className="grid border-b bg-muted/10 text-center text-xs font-semibold"
                    style={{
                        gridTemplateColumns: `64px repeat(${days.length}, 1fr)`,
                    }}
                >
                    <div className="border-r py-3 text-muted-foreground text-[11px]">
                        Time
                    </div>
                    {days.map((day, idx) => {
                        const dayActive = isSameDay(day, doctorToday);
                        const isDaySelected = isSameDay(day, calendarDate);
                        return (
                            <div
                                key={idx}
                                className={`border-r last:border-r-0 py-2.5 px-1 transition-colors ${dayActive ? "bg-primary/5 text-primary" : "text-foreground"
                                    } ${isDaySelected && view === "week" ? "ring-1 ring-primary/30" : ""}`}
                            >
                                <div className="text-[11px] font-normal text-muted-foreground">
                                    {DAY_NAMES[day.getDay()]}
                                </div>
                                <div className="text-sm font-bold flex items-center justify-center gap-1">
                                    <span>{format(day, "d MMM")}</span>
                                    {dayActive && (
                                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Calendar Body Grid */}
                <div
                    className="grid relative"
                    style={{
                        gridTemplateColumns: `64px repeat(${days.length}, 1fr)`,
                        height: `${(endHour - startHour) * HOUR_HEIGHT_PX}px`,
                    }}
                >
                    {/* Time labels axis */}
                    <div className="border-r bg-muted/5 relative">
                        {hours.map((h, i) => (
                            <div
                                key={h}
                                className="absolute right-2 text-[10px] font-mono text-muted-foreground -translate-y-1/2"
                                style={{ top: `${i * HOUR_HEIGHT_PX}px` }}
                            >
                                {String(h).padStart(2, "0")}:00
                            </div>
                        ))}
                    </div>

                    {/* Day Columns */}
                    {days.map((day, colIdx) => {
                        const dayOfWeek = day.getDay();
                        const dayFormatted = format(day, "yyyy-MM-dd");

                        // Doctor's working shifts for this day
                        const dayShifts = (doctor?.workingHours || []).filter(
                            (s) => s.dayOfWeek === dayOfWeek
                        );
                        const isDayOff = dayShifts.length === 0;

                        // Appointments falling on this date in doctor's timezone
                        const dayAppointments = appointments.filter((appt) => {
                            const info = getDoctorTimeInfo(appt.startsAt);
                            return info.dateStr === dayFormatted;
                        });

                        return (
                            <div
                                key={colIdx}
                                className={`border-r last:border-r-0 relative transition-colors ${isDayOff ? "bg-muted/15" : "bg-card"
                                    }`}
                            >
                                {/* Hour horizontal guideline lines */}
                                {hours.map((_, i) => (
                                    <div
                                        key={i}
                                        className="absolute left-0 right-0 border-t border-border/40"
                                        style={{ top: `${i * HOUR_HEIGHT_PX}px` }}
                                    />
                                ))}

                                {/* Day Off Empty Shading Overlay */}
                                {isDayOff && dayAppointments.length === 0 && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/40 rotate-[-20deg]">
                                            Day Off
                                        </span>
                                    </div>
                                )}

                                {/* Appointments */}
                                {dayAppointments.map((appt) => {
                                    const startInfo = getDoctorTimeInfo(appt.startsAt);
                                    const endInfo = getDoctorTimeInfo(appt.endsAt);

                                    const apptStartMins = startInfo.totalMinutes;
                                    const apptEndMins = endInfo.totalMinutes;

                                    const topPx = ((apptStartMins - earliestMinutes) / totalMinutes) * ((endHour - startHour) * HOUR_HEIGHT_PX);
                                    const rawHeight = ((apptEndMins - apptStartMins) / totalMinutes) * ((endHour - startHour) * HOUR_HEIGHT_PX);
                                    const heightPx = Math.max(rawHeight - 4, 36);

                                    const style = getStatusStyle(appt.status);
                                    const StatusIcon = style.icon;

                                    const patientName =
                                        typeof appt.patientId === "object" && appt.patientId !== null
                                            ? (appt.patientId as Patient).name
                                            : "Patient";

                                    return (
                                        <button
                                            key={appt._id}
                                            type="button"
                                            aria-label={`Appointment for ${patientName} at ${startInfo.timeLabel}, status: ${appt.status}`}
                                            onClick={() => onSelectAppointment(appt)}
                                            style={{
                                                top: `${Math.max(topPx, 0)}px`,
                                                height: `${heightPx}px`,
                                            }}
                                            className={`absolute left-1 right-1 rounded p-1 text-left border overflow-hidden cursor-pointer shadow-2xs transition-all hover:z-20 ${style.bg}`}
                                        >
                                            <div className="flex items-center justify-between gap-1 leading-none">
                                                <span className="font-semibold text-[11px] truncate">
                                                    {patientName}
                                                </span>
                                                <StatusIcon className="h-3 w-3 shrink-0" />
                                            </div>
                                            <div className="text-[10px] font-mono opacity-80 mt-0.5">
                                                {startInfo.timeLabel} – {endInfo.timeLabel}
                                            </div>
                                            {appt.reason && heightPx > 45 && (
                                                <div className="text-[10px] truncate opacity-75 mt-0.5">
                                                    {appt.reason}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
