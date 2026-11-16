"use client";

import React from "react";
import {
    Activity,
    BarChart3,
    PieChart as PieChartIcon,
    Stethoscope,
} from "lucide-react";
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardStats } from "@/types";

const CHART_COLORS = [
    "#2563eb",
    "#10b981",
    "#f59e0b",
    "#ec4899",
    "#8b5cf6",
    "#06b6d4",
    "#f97316",
    "#14b8a6",
];

interface StatsChartsProps {
    stats?: DashboardStats;
    isLoading: boolean;
}

export function StatsCharts({ stats, isLoading }: StatsChartsProps) {
    return (
        <div className="space-y-6">
            {/* 1. Primary Trends Grid */}
            <div className="grid gap-6 lg:grid-cols-7">
                {/* Date-based Statistics */}
                <Card className="lg:col-span-4">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-primary" />
                            <CardTitle className="text-base sm:text-lg">
                                Registration Trends Over Time
                            </CardTitle>
                        </div>
                        <CardDescription>
                            Daily registrations of doctors and patients for the selected window
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-[300px] w-full" />
                        ) : !stats?.dateWiseStats.timeline.length ? (
                            <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                                No registration data recorded in this timeframe.
                            </div>
                        ) : (
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart
                                        data={stats.dateWiseStats.timeline}
                                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                    >
                                        <defs>
                                            <linearGradient id="patientGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="doctorGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                        <XAxis dataKey="date" className="text-xs fill-muted-foreground" tickLine={false} />
                                        <YAxis className="text-xs fill-muted-foreground" allowDecimals={false} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: "var(--card)",
                                                borderColor: "var(--border)",
                                                borderRadius: "0.5rem",
                                                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                            }}
                                        />
                                        <Legend />
                                        <Area
                                            type="monotone"
                                            dataKey="patients"
                                            name="Patients"
                                            stroke="#2563eb"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#patientGrad)"
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="doctors"
                                            name="Doctors"
                                            stroke="#10b981"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#doctorGrad)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Patients per Doctor Bar Chart */}
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Stethoscope className="h-5 w-5 text-indigo-500" />
                            <CardTitle className="text-base sm:text-lg">
                                Patients Per Doctor
                            </CardTitle>
                        </div>
                        <CardDescription>
                            Patient distribution across top registered doctors
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-[300px] w-full" />
                        ) : !stats?.patientsPerDoctor.topDoctors.length ? (
                            <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                                No doctors found in the database.
                            </div>
                        ) : (
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={stats.patientsPerDoctor.topDoctors}
                                        layout="vertical"
                                        margin={{ top: 10, right: 20, left: 20, bottom: 0 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                        <XAxis type="number" allowDecimals={false} className="text-xs fill-muted-foreground" />
                                        <YAxis
                                            type="category"
                                            dataKey="name"
                                            className="text-xs fill-muted-foreground"
                                            tickLine={false}
                                            width={90}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: "var(--card)",
                                                borderColor: "var(--border)",
                                                borderRadius: "0.5rem",
                                            }}
                                        />
                                        <Bar
                                            dataKey="patientCount"
                                            name="Patients"
                                            fill="#6366f1"
                                            radius={[0, 4, 4, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* 2. Secondary Visual Insights: Specialization & Conditions */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Specialization Distribution */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <PieChartIcon className="h-5 w-5 text-purple-500" />
                            <CardTitle className="text-base sm:text-lg">
                                Doctors by Specialization
                            </CardTitle>
                        </div>
                        <CardDescription>
                            Breakdown of medical specialties across doctors
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-[260px] w-full" />
                        ) : !stats?.insights.specializationStats.length ? (
                            <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
                                No specialization data available.
                            </div>
                        ) : (
                            <div className="h-[260px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={stats.insights.specializationStats}
                                            dataKey="doctorCount"
                                            nameKey="specialization"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={90}
                                            paddingAngle={4}
                                        >
                                            {stats.insights.specializationStats.map((_, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: "var(--card)",
                                                borderColor: "var(--border)",
                                                borderRadius: "0.5rem",
                                            }}
                                        />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Common Patient Conditions */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-emerald-500" />
                            <CardTitle className="text-base sm:text-lg">
                                Top Patient Conditions
                            </CardTitle>
                        </div>
                        <CardDescription>
                            Most frequently recorded patient diagnoses
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-[260px] w-full" />
                        ) : !stats?.insights.topConditions.length ? (
                            <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
                                No patient condition records found.
                            </div>
                        ) : (
                            <div className="h-[260px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={stats.insights.topConditions}
                                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                        <XAxis dataKey="condition" className="text-xs fill-muted-foreground" tickLine={false} />
                                        <YAxis allowDecimals={false} className="text-xs fill-muted-foreground" tickLine={false} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: "var(--card)",
                                                borderColor: "var(--border)",
                                                borderRadius: "0.5rem",
                                            }}
                                        />
                                        <Bar
                                            dataKey="patientCount"
                                            name="Patients"
                                            fill="#10b981"
                                            radius={[4, 4, 0, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default StatsCharts;
