"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Calendar,
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    TrendingUp,
    Stethoscope,
    Loader2,
} from "lucide-react";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from "recharts";

import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { ApiResponse, AppointmentsDashboardStats } from "@/types";

interface AppointmentsDashboardProps {
    initialRange?: "7d" | "30d" | "90d" | "1y" | "all";
}

export function AppointmentsDashboard({
    initialRange = "30d",
}: AppointmentsDashboardProps) {
    const [range, setRange] = useState<"7d" | "30d" | "90d" | "1y" | "all">(
        initialRange
    );

    const { data: response, isLoading } = useQuery({
        queryKey: qk.dashboard.appointments(range),
        queryFn: () =>
            api.get<ApiResponse<AppointmentsDashboardStats>>(
                `/dashboard/appointments?range=${range}`
            ),
    });

    const stats = response?.data;
    const next7Days = stats?.next7Days;

    const chartData = useMemo(() => {
        if (!next7Days) return [];
        return next7Days.map((item) => {
            const parts = item.date.split("-");
            const label = parts.length === 3 ? `${parts[1]}/${parts[2]}` : item.date;
            return {
                date: item.date,
                shortDate: label,
                scheduled: item.scheduledCount,
            };
        });
    }, [next7Days]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12 text-muted-foreground text-xs gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Loading appointment analytics...
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
                Unable to load appointment statistics.
            </div>
        );
    }

    const { today, noShowRate, topBusiestDoctors } = stats;

    return (
        <div className="space-y-6">
            {/* Toolbar: Title and Range Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        Clinical Appointments Overview
                    </h2>
                    <p className="text-xs text-muted-foreground">
                        Today&apos;s consultation volume, completion metrics, and 7-day scheduled forecasts.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Analysis Range:</span>
                    <Select
                        value={range}
                        onValueChange={(val) =>
                            setRange(val as "7d" | "30d" | "90d" | "1y" | "all")
                        }
                    >
                        <SelectTrigger className="h-8 text-xs w-[120px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7d" className="text-xs">
                                Last 7 Days
                            </SelectItem>
                            <SelectItem value="30d" className="text-xs">
                                Last 30 Days
                            </SelectItem>
                            <SelectItem value="90d" className="text-xs">
                                Last 90 Days
                            </SelectItem>
                            <SelectItem value="1y" className="text-xs">
                                Past Year
                            </SelectItem>
                            <SelectItem value="all" className="text-xs">
                                All History
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Today's KPI Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* Total Today */}
                <Card className="shadow-2xs">
                    <CardHeader className="p-3 pb-1">
                        <CardDescription className="text-[11px] font-medium text-muted-foreground">
                            Today&apos;s Total
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                        <div className="text-2xl font-bold text-foreground">
                            {today.total}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                            Scheduled visits
                        </p>
                    </CardContent>
                </Card>

                {/* Scheduled */}
                <Card className="shadow-2xs">
                    <CardHeader className="p-3 pb-1">
                        <CardDescription className="text-[11px] font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Upcoming
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {today.scheduled}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                            Remaining today
                        </p>
                    </CardContent>
                </Card>

                {/* Completed */}
                <Card className="shadow-2xs">
                    <CardHeader className="p-3 pb-1">
                        <CardDescription className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Completed
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                            {today.completed}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                            Finished consultations
                        </p>
                    </CardContent>
                </Card>

                {/* No-Show */}
                <Card className="shadow-2xs">
                    <CardHeader className="p-3 pb-1">
                        <CardDescription className="text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            No-Show
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                            {today.noShow}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                            Missed appointments
                        </p>
                    </CardContent>
                </Card>

                {/* Cancelled */}
                <Card className="shadow-2xs">
                    <CardHeader className="p-3 pb-1">
                        <CardDescription className="text-[11px] font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1">
                            <XCircle className="h-3 w-3" />
                            Cancelled
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                        <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                            {today.cancelled}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                            Patient or clinic cancel
                        </p>
                    </CardContent>
                </Card>

                {/* No-Show Rate */}
                <Card className="shadow-2xs bg-amber-500/5 border-amber-500/20">
                    <CardHeader className="p-3 pb-1">
                        <CardDescription className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            No-Show Rate
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                        <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                            {noShowRate.ratePercentage.toFixed(1)}%
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                            {noShowRate.noShowCount} of {noShowRate.totalAppointments} ({range})
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Visuals Grid: Forecast Chart & Busiest Doctors */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* 7-Day Scheduled Outlook Bar Chart */}
                <Card className={`shadow-xs ${topBusiestDoctors && topBusiestDoctors.length > 0 ? "lg:col-span-2" : "lg:col-span-3"}`}>
                    <CardHeader className="border-b pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary" />
                            Next 7 Days Consultation Forecast
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Scheduled appointment volume projected across the upcoming week.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-6">
                        {chartData.length === 0 ? (
                            <div className="h-[240px] flex items-center justify-center text-xs text-muted-foreground border border-dashed rounded-lg">
                                No scheduled consultations for the next 7 days.
                            </div>
                        ) : (
                            <div className="h-[240px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={chartData}
                                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                        <XAxis
                                            dataKey="shortDate"
                                            tickLine={false}
                                            axisLine={false}
                                            fontSize={11}
                                            stroke="#888888"
                                        />
                                        <YAxis
                                            tickLine={false}
                                            axisLine={false}
                                            fontSize={11}
                                            stroke="#888888"
                                            allowDecimals={false}
                                        />
                                        <Tooltip
                                            content={({ active, payload }) => {
                                                if (!active || !payload || !payload.length) return null;
                                                const d = payload[0].payload;
                                                return (
                                                    <div className="rounded-lg border bg-popover p-2 shadow-md text-xs">
                                                        <div className="font-semibold text-popover-foreground">
                                                            {d.date}
                                                        </div>
                                                        <div className="text-primary mt-0.5">
                                                            Scheduled: <span className="font-bold">{d.scheduled}</span>
                                                        </div>
                                                    </div>
                                                );
                                            }}
                                        />
                                        <Bar
                                            dataKey="scheduled"
                                            fill="currentColor"
                                            className="fill-primary"
                                            radius={[4, 4, 0, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Top Busiest Doctors List (RENDERED ONLY WHEN topBusiestDoctors is returned) */}
                {topBusiestDoctors && topBusiestDoctors.length > 0 && (
                    <Card className="shadow-xs flex flex-col">
                        <CardHeader className="border-b pb-3">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <Stethoscope className="h-4 w-4 text-primary" />
                                Top Busiest Practitioners
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Doctors with highest consultation demand in selected range.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-3 flex-1 overflow-y-auto space-y-2.5">
                            {topBusiestDoctors.map((doc, idx) => (
                                <div
                                    key={doc.doctorId}
                                    className="flex items-center justify-between gap-3 p-2.5 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                                            #{idx + 1}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-semibold text-xs text-foreground truncate">
                                                {doc.name}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                                                <span>{doc.specialization}</span>
                                                <span>•</span>
                                                <span className="truncate">{doc.hospital}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="text-xs font-bold text-primary">
                                            {doc.scheduledCount}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground">
                                            Appts
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
