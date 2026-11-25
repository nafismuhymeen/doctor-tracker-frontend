"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserCog, AlertTriangle, Loader2, Stethoscope, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { useAuth } from "@/components/providers/auth-provider";
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { ApiResponse, AppUser, Doctor, Role } from "@/types";

const editUserSchema = z
    .object({
        name: z
            .string()
            .trim()
            .min(2, "Name must be at least 2 characters")
            .max(100, "Name cannot exceed 100 characters"),
        role: z.enum(["admin", "staff", "doctor", "viewer"]),
        doctorId: z.string().optional(),
        isActive: z.boolean(),
    })
    .refine(
        (data) => {
            if (data.role === "doctor") {
                return !!data.doctorId && data.doctorId.length > 0;
            }
            return true;
        },
        {
            message: "Doctor record selection is required when role is Doctor",
            path: ["doctorId"],
        }
    );

type EditUserFormData = z.infer<typeof editUserSchema>;

interface EditUserDialogProps {
    user: AppUser | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditUserDialog({ user, open, onOpenChange }: EditUserDialogProps) {
    const queryClient = useQueryClient();
    const { user: currentUser } = useAuth();

    const isSelf = currentUser?.id === user?.id;

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors },
    } = useForm<EditUserFormData>({
        resolver: zodResolver(editUserSchema),
        defaultValues: {
            name: "",
            role: "staff",
            doctorId: "",
            isActive: true,
        },
    });

    useEffect(() => {
        if (user) {
            reset({
                name: user.name,
                role: user.role,
                doctorId: user.doctorId || "",
                isActive: user.isActive,
            });
        }
    }, [user, reset]);

    const selectedRole = watch("role");

    // Fetch active doctors for assignment when role is doctor
    const { data: doctorsData, isLoading: isLoadingDoctors } = useQuery({
        queryKey: qk.doctors.list("limit=100"),
        queryFn: () =>
            api.get<ApiResponse<{ doctors: Doctor[] }>>("/doctors?limit=100"),
        enabled: open && selectedRole === "doctor",
    });

    const doctors = doctorsData?.data?.doctors || [];

    const updateMutation = useMutation({
        mutationFn: async (data: EditUserFormData) => {
            if (!user) throw new Error("No user selected");
            const payload: {
                name: string;
                role?: Role;
                doctorId?: string | null;
                isActive?: boolean;
            } = {
                name: data.name,
            };

            // If not self, allow role, doctorId, isActive updates
            if (!isSelf) {
                payload.role = data.role;
                payload.isActive = data.isActive;
                payload.doctorId = data.role === "doctor" ? data.doctorId : null;
            }

            return api.patch(`/users/${user.id}`, payload);
        },
        onSuccess: () => {
            toast.success("User updated successfully", {
                description: "Session tokens have been updated.",
            });
            queryClient.invalidateQueries({ queryKey: qk.users.all() });
            onOpenChange(false);
        },
        onError: (err: unknown) => {
            if (err instanceof ApiError) {
                if (err.code === "LAST_ADMIN") {
                    toast.error("Update Blocked", {
                        description: "At least one active administrator is required.",
                    });
                    return;
                }
                if (err.code === "DOCTOR_ALREADY_ASSIGNED") {
                    toast.error("Update Blocked", {
                        description: "This doctor record is already linked to another user account.",
                    });
                    return;
                }
                if (
                    err.code === "CANNOT_DEACTIVATE_SELF" ||
                    err.code === "CANNOT_DEMOTE_SELF"
                ) {
                    toast.error("Action Prohibited", {
                        description: "You cannot change the role or deactivate your own account.",
                    });
                    return;
                }
                toast.error("Update Failed", { description: err.message });
            } else {
                toast.error("Update Failed", {
                    description: "An unexpected error occurred while updating the user.",
                });
            }
        },
    });

    if (!user) return null;

    const onSubmit = (data: EditUserFormData) => {
        updateMutation.mutate(data);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserCog className="h-5 w-5 text-primary" />
                        Edit User Account
                    </DialogTitle>
                    <DialogDescription>
                        Update account details and role permissions for {user.name} ({user.email}).
                    </DialogDescription>
                </DialogHeader>

                {/* Session Revocation Warning Callout */}
                <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div>
                        <span className="font-semibold">Security Notice:</span> Changing a user&apos;s role
                        or deactivating their account immediately revokes all of their active sessions across all devices.
                    </div>
                </div>

                {isSelf && (
                    <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50/60 p-2.5 text-xs text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/20 dark:text-blue-200">
                        <ShieldAlert className="h-4 w-4 shrink-0 text-blue-600" />
                        <span>You are editing your own account. Role and status changes are disabled.</span>
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-1">
                    {/* Name */}
                    <div className="space-y-1.5">
                        <Label htmlFor="edit-name">Full Name *</Label>
                        <Input
                            id="edit-name"
                            disabled={updateMutation.isPending}
                            {...register("name")}
                        />
                        {errors.name && (
                            <p className="text-xs text-destructive">
                                {errors.name.message}
                            </p>
                        )}
                    </div>

                    {/* Role Select */}
                    <div className="space-y-1.5">
                        <Label htmlFor="edit-role">Role *</Label>
                        <Select
                            value={selectedRole}
                            onValueChange={(val: Role) => {
                                setValue("role", val, { shouldValidate: true });
                                if (val !== "doctor") {
                                    setValue("doctorId", "", { shouldValidate: true });
                                }
                            }}
                            disabled={updateMutation.isPending || isSelf}
                        >
                            <SelectTrigger id="edit-role" className="w-full" aria-label="Role">
                                <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="admin">Administrator (Full Access)</SelectItem>
                                <SelectItem value="staff">Clinical Staff (Patients & Appointments)</SelectItem>
                                <SelectItem value="doctor">Practitioner Doctor (Own Roster)</SelectItem>
                                <SelectItem value="viewer">Viewer (Read-Only Audit & Catalogs)</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.role && (
                            <p className="text-xs text-destructive">
                                {errors.role.message}
                            </p>
                        )}
                    </div>

                    {/* Doctor Picker (shown when role is doctor) */}
                    {selectedRole === "doctor" && (
                        <div className="space-y-1.5 rounded-lg border border-blue-200/60 bg-blue-50/50 p-3 dark:border-blue-950 dark:bg-blue-950/20">
                            <Label htmlFor="edit-doctorId" className="flex items-center gap-1.5 text-xs font-semibold">
                                <Stethoscope className="h-3.5 w-3.5 text-primary" />
                                Link Doctor Practitioner *
                            </Label>
                            <Select
                                value={watch("doctorId") || ""}
                                onValueChange={(val) =>
                                    setValue("doctorId", val, { shouldValidate: true })
                                }
                                disabled={updateMutation.isPending || isLoadingDoctors || isSelf}
                            >
                                <SelectTrigger id="edit-doctorId" className="w-full bg-background" aria-label="Link Doctor Practitioner">
                                    <SelectValue
                                        placeholder={
                                            isLoadingDoctors
                                                ? "Loading doctors..."
                                                : "Choose practitioner record"
                                        }
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {doctors.length === 0 ? (
                                        <SelectItem value="none" disabled>
                                            No doctors available
                                        </SelectItem>
                                    ) : (
                                        doctors.map((doc) => (
                                            <SelectItem key={doc._id} value={doc._id}>
                                                {doc.name} — {doc.specialization} ({doc.hospital})
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                            {errors.doctorId && (
                                <p className="text-xs text-destructive">
                                    {errors.doctorId.message}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Active Status */}
                    <div className="space-y-1.5">
                        <Label htmlFor="edit-isActive">Account Status *</Label>
                        <Select
                            value={watch("isActive") ? "active" : "inactive"}
                            onValueChange={(val) =>
                                setValue("isActive", val === "active", { shouldValidate: true })
                            }
                            disabled={updateMutation.isPending || isSelf}
                        >
                            <SelectTrigger id="edit-isActive" className="w-full" aria-label="Account status">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="active">Active (Can Sign In)</SelectItem>
                                <SelectItem value="inactive">Disabled / Deactivated</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter className="pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={updateMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={updateMutation.isPending}>
                            {updateMutation.isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

