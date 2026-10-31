"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { HeartPulse, Lock, Mail, Loader2, ArrowRight } from "lucide-react";

import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Admin, ApiResponse } from "@/types";

const loginSchema = z.object({
    email: z
        .email("Please provide a valid email address")
        .min(1, "Email is required"),
    password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const { login } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const onSubmit = async (data: LoginFormData) => {
        try {
            setIsSubmitting(true);
            const response = await api.post<ApiResponse<{ admin: Admin }>>(
                "/auth/login",
                data
            );

            if (response.data?.admin) {
                toast.success("Welcome back!", {
                    description: `Signed in as ${response.data.admin.name}`,
                });
                login(response.data.admin);
            }
        } catch (error: any) {
            const message =
                error instanceof ApiError
                    ? error.message
                    : "Unable to sign in. Please verify your credentials.";
            toast.error("Authentication Failed", { description: message });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="relative min-h-screen flex flex-col justify-center items-center p-4 bg-muted/20">
            <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
                <ThemeToggle />
            </div>

            <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-[20%] right-10 w-[450px] h-[450px] bg-indigo-500/10 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-md space-y-6">
                <div className="flex flex-col items-center text-center space-y-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25">
                        <HeartPulse className="h-7 w-7" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Doctor Tracker
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Administrative portal to manage healthcare personnel & patients
                    </p>
                </div>

                <Card className="shadow-lg border-muted">
                    <CardHeader className="space-y-1 pb-4">
                        <CardTitle className="text-xl">Sign In</CardTitle>
                        <CardDescription>
                            Enter your administrator credentials to access the portal
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="admin@example.com"
                                        className="pl-9"
                                        autoComplete="email"
                                        disabled={isSubmitting}
                                        {...register("email")}
                                    />
                                </div>
                                {errors.email && (
                                    <p className="text-xs text-destructive font-medium">
                                        {errors.email.message}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        className="pl-9"
                                        autoComplete="current-password"
                                        disabled={isSubmitting}
                                        {...register("password")}
                                    />
                                </div>
                                {errors.password && (
                                    <p className="text-xs text-destructive font-medium">
                                        {errors.password.message}
                                    </p>
                                )}
                            </div>
                        </CardContent>

                        <CardFooter className="flex flex-col space-y-4 pt-2">
                            <Button
                                type="submit"
                                className="w-full gap-2 font-semibold"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Authenticating...
                                    </>
                                ) : (
                                    <>
                                        Sign In
                                        <ArrowRight className="h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>

                <div className="rounded-lg border bg-card/60 p-3 text-center text-xs text-muted-foreground backdrop-blur-sm">
                    <p className="font-medium text-foreground">
                        Default Seeded Admin Credentials:
                    </p>
                    <p className="mt-1">
                        Run <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">yarn seed:admin</code> in the backend, then sign in with your configured admin email & password.
                    </p>
                </div>
            </div>
        </div>
    );
}

