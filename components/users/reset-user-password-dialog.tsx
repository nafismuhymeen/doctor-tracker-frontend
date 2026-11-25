"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@tanstack/react-query";
import { KeyRound, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";
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
import type { AppUser } from "@/types";

const resetPasswordSchema = z
    .object({
        password: z
            .string()
            .min(10, "Password must be at least 10 characters")
            .max(72, "Password cannot exceed 72 characters")
            .regex(/[A-Za-z]/, "Password must contain at least one letter")
            .regex(/\d/, "Password must contain at least one digit"),
        confirmPassword: z.string().min(1, "Please confirm the password"),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

interface ResetUserPasswordDialogProps {
    user: AppUser | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ResetUserPasswordDialog({
    user,
    open,
    onOpenChange,
}: ResetUserPasswordDialogProps) {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<ResetPasswordFormData>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: {
            password: "",
            confirmPassword: "",
        },
    });

    const resetMutation = useMutation({
        mutationFn: async (data: ResetPasswordFormData) => {
            if (!user) throw new Error("No user selected");
            return api.post(`/users/${user.id}/reset-password`, {
                password: data.password,
            });
        },
        onSuccess: () => {
            toast.success("Password reset successfully", {
                description: `All active sessions for ${user?.name} have been revoked.`,
            });
            reset();
            onOpenChange(false);
        },
        onError: (err: unknown) => {
            if (err instanceof ApiError) {
                toast.error("Password Reset Failed", { description: err.message });
            } else {
                toast.error("Password Reset Failed", {
                    description: "An unexpected error occurred while resetting the password.",
                });
            }
        },
    });

    if (!user) return null;

    const onSubmit = (data: ResetPasswordFormData) => {
        resetMutation.mutate(data);
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!resetMutation.isPending) {
                    if (!next) reset();
                    onOpenChange(next);
                }
            }}
        >
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <KeyRound className="h-5 w-5 text-primary" />
                        Reset User Password
                    </DialogTitle>
                    <DialogDescription>
                        Set a new password for {user.name} ({user.email}).
                    </DialogDescription>
                </DialogHeader>

                <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <span>
                        Resetting the password immediately revokes all of this user&apos;s existing sessions across all browsers.
                    </span>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
                    {/* New Password */}
                    <div className="space-y-1.5">
                        <Label htmlFor="reset-password">New Password *</Label>
                        <div className="relative">
                            <Input
                                id="reset-password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Min 10 chars with letters & numbers"
                                disabled={resetMutation.isPending}
                                className="pr-10"
                                {...register("password")}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex={-1}
                                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                            >
                                {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                        {errors.password && (
                            <p className="text-xs text-destructive">
                                {errors.password.message}
                            </p>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-1.5">
                        <Label htmlFor="reset-confirm">Confirm Password *</Label>
                        <div className="relative">
                            <Input
                                id="reset-confirm"
                                type={showConfirm ? "text" : "password"}
                                placeholder="Re-enter new password"
                                disabled={resetMutation.isPending}
                                className="pr-10"
                                {...register("confirmPassword")}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm(!showConfirm)}
                                tabIndex={-1}
                                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                            >
                                {showConfirm ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                        {errors.confirmPassword && (
                            <p className="text-xs text-destructive">
                                {errors.confirmPassword.message}
                            </p>
                        )}
                    </div>

                    <DialogFooter className="pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={resetMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={resetMutation.isPending}>
                            {resetMutation.isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Update Password
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

