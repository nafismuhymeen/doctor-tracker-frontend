"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Stethoscope,
    Users,
    Activity,
    TrendingUp,
    Calendar,
    RefreshCw,
    BarChart3,
    PieChart as PieChartIcon,
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

import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";
import type { ApiResponse, DashboardStats } from "@/types";

const CHART_COLORS = [
    "#2563eb",
    "#7c3aed",
    "#059669",
    "#d97706",
    "#dc2626",
    "#0284c7",
    "#db2777",
    "#4b5563",
];

export default function DashboardPage() {
    const [timeRange, setTimeRange] = useState("30d");

    const {
        data: response,
        isLoading,
        isRefetching,
        refetch,
    } = useQuery({
        queryKey: ["dashboardStats", timeRange],
        queryFn: () =>
            api.get<ApiResponse<DashboardStats>>(
                `/dashboard/stats?range=${timeRange}`
            ),
    });

    const stats = response?.data;

    return (
        <AppLayout>
            <div className="space-y-6">
                {/* Header section with Range Selector */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                            Admin Dashboard
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            System performance, doctor patient distributions, and registration trends
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="w-[140px]">
                            <Select
                                value={timeRange}
                                onValueChange={(val) => setTimeRange(val)}
                            >
                                <SelectTrigger className="h-9">
                                    <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                                    <SelectValue placeholder="Select Range" />
                                </SelectTrigger>
                                <SelectContent align="end">
                                    <SelectItem value="7d">Last 7 days</SelectItem>
                                    <SelectItem value="30d">Last 30 days</SelectItem>
                                    <SelectItem value="90d">Last 90 days</SelectItem>
                                    <SelectItem value="1y">Last year</SelectItem>
                                    <SelectItem value="all">All time</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => refetch()}
                            title="Refresh statistics"
                        >
                            <RefreshCw
                                className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`}
                            />
                        </Button>
                    </div>
                </div>

                {/* 1. Summary Cards */}
                <div className="grid gap-4 sm:grid-cols-3">
                    {/* Total Doctors */}
                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Total Doctors
                            </CardTitle>
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <Stethoscope className="h-5 w-5" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <Skeleton className="h-8 w-20" />
                            ) : (
                                <div className="text-2xl sm:text-3xl font-bold">
                                    {stats?.summary.totalDoctors ?? 0}
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                                Verified medical specialists
                            </p>
                        </CardContent>
                    </Card>

                    {/* Total Patients */}
                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Total Patients
                            </CardTitle>
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <Users className="h-5 w-5" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <Skeleton className="h-8 w-20" />
                            ) : (
                                <div className="text-2xl sm:text-3xl font-bold">
                                    {stats?.summary.totalPatients ?? 0}
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                                Active registered patients
                            </p>
                        </CardContent>
                    </Card>

                    {/* Patients per Doctor */}
                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Avg. Patients / Doctor
                            </CardTitle>
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                <TrendingUp className="h-5 w-5" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <Skeleton className="h-8 w-20" />
                            ) : (
                                <div className="text-2xl sm:text-3xl font-bold">
                                    {stats?.summary.averagePatientsPerDoctor ?? 0}
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                                Workload ratio per doctor
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* 2. Primary Charts Grid */}
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
                                                <linearGradient
                                                    id="patientGrad"
                                                    x1="0"
                                                    y1="0"
                                                    x2="0"
                                                    y2="1"
                                                >
                                                    <stop
                                                        offset="5%"
                                                        stopColor="#2563eb"
                                                        stopOpacity={0.4}
                                                    />
                                                    <stop
                                                        offset="95%"
                                                        stopColor="#2563eb"
                                                        stopOpacity={0}
                                                    />
                                                </linearGradient>
                                                <linearGradient
                                                    id="doctorGrad"
                                                    x1="0"
                                                    y1="0"
                                                    x2="0"
                                                    y2="1"
                                                >
                                                    <stop
                                                        offset="5%"
                                                        stopColor="#10b981"
                                                        stopOpacity={0.4}
                                                    />
                                                    <stop
                                                        offset="95%"
                                                        stopColor="#10b981"
                                                        stopOpacity={0}
                                                    />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                className="stroke-muted"
                                            />
                                            <XAxis
                                                dataKey="date"
                                                className="text-xs fill-muted-foreground"
                                                tickLine={false}
                                            />
                                            <YAxis
                                                className="text-xs fill-muted-foreground"
                                                allowDecimals={false}
                                                tickLine={false}
                                            />
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
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                className="stroke-muted"
                                            />
                                            <XAxis
                                                type="number"
                                                allowDecimals={false}
                                                className="text-xs fill-muted-foreground"
                                            />
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

                {/* 3. Secondary Visual Insights: Specialization & Conditions */}
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
                                                {stats.insights.specializationStats.map(
                                                    (_, index) => (
                                                        <Cell
                                                            key={`cell-${index}`}
                                                            fill={
                                                                CHART_COLORS[
                                                                index %
                                                                CHART_COLORS.length
                                                                ]
                                                            }
                                                        />
                                                    )
                                                )}
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
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                className="stroke-muted"
                                            />
                                            <XAxis
                                                dataKey="condition"
                                                className="text-xs fill-muted-foreground"
                                                tickLine={false}
                                            />
                                            <YAxis
                                                allowDecimals={false}
                                                className="text-xs fill-muted-foreground"
                                                tickLine={false}
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
        </AppLayout>
    );
}

