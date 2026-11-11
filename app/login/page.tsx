"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { HeartPulse, Lock, Mail, Loader2, ArrowRight, Sparkles } from "lucide-react";

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
import type { ApiResponse, AppUser } from "@/types";

export const loginSchema = z.object({
    email: z
        .string()
        .min(1, "Email is required")
        .email("Please provide a valid email address"),
    password: z.string().min(1, "Password is required"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export function getLoginErrorMessage(error: unknown): string {
    if (error instanceof ApiError) {
        if (error.code === "ACCOUNT_DISABLED") {
            return "This account has been disabled. Contact an administrator.";
        }
        if (error.code === "INVALID_CREDENTIALS" || error.status === 401) {
            return "Invalid email or password.";
        }
        if (error.status === 429) {
            return "Too many sign-in attempts. Please wait a moment and try again.";
        }
        if (error.status === 0) {
            return "Cannot reach the server. Please check your connection.";
        }
        return error.message || "Unable to sign in. Please verify your credentials.";
    }
    return "Unable to sign in. Please verify your credentials.";
}

/**
 * Validates and sanitizes a destination URL for redirect after login.
 * Strictly accepts relative paths starting with a single '/' and rejects
 * protocol-relative URLs ('//') and Windows-style backslash escape paths.
 */
export function sanitizeNextUrl(next: string | null | undefined): string | null {
    if (!next) return null;
    if (next.startsWith("/") && !next.startsWith("//") && !next.includes("\\")) {
        return next;
    }
    return null;
}

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const nextParam = searchParams.get("next");
    const targetUrl = sanitizeNextUrl(nextParam) || "/dashboard";

    const { login, isAuthenticated, isLoading } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            router.replace(targetUrl);
        }
    }, [isLoading, isAuthenticated, router, targetUrl]);

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const demoEmail = process.env.NEXT_PUBLIC_DEMO_EMAIL;
    const demoPassword = process.env.NEXT_PUBLIC_DEMO_PASSWORD;
    const hasDemo = Boolean(demoEmail && demoPassword);

    const handleFillDemo = () => {
        if (demoEmail && demoPassword) {
            setValue("email", demoEmail, { shouldValidate: true });
            setValue("password", demoPassword, { shouldValidate: true });
        }
    };

    const onSubmit = async (data: LoginFormData) => {
        try {
            setIsSubmitting(true);
            const response = await api.post<
                ApiResponse<{ user: AppUser; accessToken?: string }>
            >("/auth/login", data);

            if (response.data?.user) {
                toast.success("Welcome back!", {
                    description: `Signed in as ${response.data.user.name}`,
                });
                login(response.data.user, targetUrl);
            }
        } catch (error: unknown) {
            const message = getLoginErrorMessage(error);
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
                        Clinical portal to manage healthcare personnel & patients
                    </p>
                </div>

                <Card className="shadow-lg border-muted">
                    <CardHeader className="space-y-1 pb-4">
                        <CardTitle className="text-xl">Sign In</CardTitle>
                        <CardDescription>
                            Enter your credentials to access the portal
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
                                        placeholder="user@example.com"
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

                            {hasDemo && (
                                <div className="pt-1">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleFillDemo}
                                        disabled={isSubmitting}
                                        className="w-full text-xs text-muted-foreground hover:text-foreground border-dashed"
                                    >
                                        <Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary" />
                                        Fill demo credentials
                                    </Button>
                                </div>
                            )}
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
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={null}>
            <LoginForm />
        </Suspense>
    );
}
