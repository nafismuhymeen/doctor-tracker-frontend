"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import {
    Stethoscope,
    Users,
    TrendingUp,
    Calendar,
    RefreshCw,
} from "lucide-react";

import { api } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import { qk } from "@/lib/query-keys";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DoctorMyDay } from "@/components/dashboard/doctor-my-day";
import type { ApiResponse, DashboardStats } from "@/types";

const StatsCharts = dynamic(
    () => import("@/components/dashboard/stats-charts"),
    {
        loading: () => (
            <div className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-7">
                    <Skeleton className="h-[380px] lg:col-span-4 rounded-xl" />
                    <Skeleton className="h-[380px] lg:col-span-3 rounded-xl" />
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                    <Skeleton className="h-[340px] rounded-xl" />
                    <Skeleton className="h-[340px] rounded-xl" />
                </div>
            </div>
        ),
    }
);

const AppointmentsDashboard = dynamic(
    () => import("@/components/dashboard/appointments-dashboard").then((mod) => mod.AppointmentsDashboard),
    {
        loading: () => (
            <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-28 rounded-xl" />
                    ))}
                </div>
                <Skeleton className="h-96 rounded-xl" />
            </div>
        ),
    }
);

export default function DashboardPage() {
    const { role } = useAuth();
    const isDoctor = role === "doctor";
    const [timeRange, setTimeRange] = useState("30d");

    const {
        data: response,
        isLoading,
        isRefetching,
        refetch,
    } = useQuery({
        queryKey: qk.dashboard.stats(timeRange),
        queryFn: () =>
            api.get<ApiResponse<DashboardStats>>(
                `/dashboard/stats?range=${timeRange}`
            ),
        enabled: !isDoctor,
    });

    const stats = response?.data;

    if (isDoctor) {
        return <DoctorMyDay />;
    }

    return (
        <div className="space-y-6">
            <Tabs defaultValue="overview" className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                            Clinical Dashboard
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            System performance, clinical appointments, and patient registration trends.
                        </p>
                    </div>

                    <TabsList className="grid grid-cols-2 w-[280px]">
                        <TabsTrigger value="overview" className="text-xs">
                            Overview
                        </TabsTrigger>
                        <TabsTrigger value="appointments" className="text-xs">
                            Appointments
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="appointments" className="space-y-6 pt-2">
                    <AppointmentsDashboard initialRange="30d" />
                </TabsContent>

                <TabsContent value="overview" className="space-y-6 pt-2">
                    {/* Header section with Range Selector */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-lg font-semibold tracking-tight">
                                Registration & Specialty Statistics
                            </h2>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Aggregated patient volume and practitioner distributions
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-[140px]">
                                <Select
                                    value={timeRange}
                                    onValueChange={(val) => setTimeRange(val)}
                                >
                                    <SelectTrigger className="h-9" aria-label="Statistics time range">
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
                                aria-label="Refresh statistics"
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

                {/* 2. Visual Insights & Charts (Dynamically Loaded) */}
                <StatsCharts stats={stats} isLoading={isLoading} />
            </TabsContent>
        </Tabs>
    </div>
    );
}

