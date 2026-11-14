"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Eye, EyeOff, Loader2, Stethoscope } from "lucide-react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
import type { ApiResponse, Doctor, Role } from "@/types";

const createUserSchema = z
    .object({
        name: z
            .string()
            .trim()
            .min(2, "Name must be at least 2 characters")
            .max(100, "Name cannot exceed 100 characters"),
        email: z
            .string()
            .trim()
            .email("Please provide a valid email address"),
        password: z
            .string()
            .min(10, "Password must be at least 10 characters")
            .max(72, "Password cannot exceed 72 characters")
            .regex(/[A-Za-z]/, "Password must contain at least one letter")
            .regex(/\d/, "Password must contain at least one digit"),
        role: z.enum(["admin", "staff", "doctor", "viewer"]),
        doctorId: z.string().optional(),
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

type CreateUserFormData = z.infer<typeof createUserSchema>;

export function CreateUserDialog() {
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors },
    } = useForm<CreateUserFormData>({
        resolver: zodResolver(createUserSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
            role: "staff",
            doctorId: "",
        },
    });

    const selectedRole = watch("role");

    // Fetch active doctors for assignment when role is doctor
    const { data: doctorsData, isLoading: isLoadingDoctors } = useQuery({
        queryKey: qk.doctors.list("limit=100"),
        queryFn: () =>
            api.get<ApiResponse<{ doctors: Doctor[] }>>("/doctors?limit=100"),
        enabled: open && selectedRole === "doctor",
    });

    const doctors = doctorsData?.data?.doctors || [];

    const createMutation = useMutation({
        mutationFn: async (data: CreateUserFormData) => {
            const payload: {
                name: string;
                email: string;
                password: string;
                role: Role;
                doctorId?: string;
            } = {
                name: data.name,
                email: data.email,
                password: data.password,
                role: data.role,
            };
            if (data.role === "doctor" && data.doctorId) {
                payload.doctorId = data.doctorId;
            }
            return api.post("/users", payload);
        },
        onSuccess: () => {
            toast.success("User created successfully");
            queryClient.invalidateQueries({ queryKey: qk.users.all() });
            reset();
            setOpen(false);
        },
        onError: (err: unknown) => {
            if (err instanceof ApiError) {
                if (err.code === "EMAIL_IN_USE" || err.status === 409) {
                    toast.error("Registration Failed", {
                        description: "This email address is already in use by another account.",
                    });
                    return;
                }
                if (err.code === "DOCTOR_ALREADY_ASSIGNED") {
                    toast.error("Registration Failed", {
                        description: "This doctor record is already linked to another user account.",
                    });
                    return;
                }
                toast.error("Creation Failed", { description: err.message });
            } else {
                toast.error("Creation Failed", {
                    description: "An unexpected error occurred while creating the user.",
                });
            }
        },
    });

    const onSubmit = (data: CreateUserFormData) => {
        createMutation.mutate(data);
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!createMutation.isPending) {
                    if (!next) reset();
                    setOpen(next);
                }
            }}
        >
            <DialogTrigger asChild>
                <Button className="gap-2 shadow-xs">
                    <UserPlus className="h-4 w-4" />
                    <span>Create User</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserPlus className="h-5 w-5 text-primary" />
                        Create New User
                    </DialogTitle>
                    <DialogDescription>
                        Provision a new user account with role-based permissions.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
                    {/* Name */}
                    <div className="space-y-1.5">
                        <Label htmlFor="name">Full Name *</Label>
                        <Input
                            id="name"
                            placeholder="Jane Doe"
                            disabled={createMutation.isPending}
                            {...register("name")}
                        />
                        {errors.name && (
                            <p className="text-xs text-destructive">
                                {errors.name.message}
                            </p>
                        )}
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                        <Label htmlFor="email">Email Address *</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="user@hospital.org"
                            disabled={createMutation.isPending}
                            {...register("email")}
                        />
                        {errors.email && (
                            <p className="text-xs text-destructive">
                                {errors.email.message}
                            </p>
                        )}
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                        <Label htmlFor="password">Initial Password *</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Min 10 chars with letters & numbers"
                                disabled={createMutation.isPending}
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
                        <p className="text-[11px] text-muted-foreground">
                            10–72 characters, must contain at least 1 letter and 1 digit.
                        </p>
                        {errors.password && (
                            <p className="text-xs text-destructive">
                                {errors.password.message}
                            </p>
                        )}
                    </div>

                    {/* Role Select */}
                    <div className="space-y-1.5">
                        <Label htmlFor="role">Role *</Label>
                        <Select
                            value={selectedRole}
                            onValueChange={(val: Role) => {
                                setValue("role", val, { shouldValidate: true });
                                if (val !== "doctor") {
                                    setValue("doctorId", "", { shouldValidate: true });
                                }
                            }}
                            disabled={createMutation.isPending}
                        >
                            <SelectTrigger id="role" className="w-full">
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

                    {/* Doctor Picker (shown only when role is doctor) */}
                    {selectedRole === "doctor" && (
                        <div className="space-y-1.5 rounded-lg border border-blue-200/60 bg-blue-50/50 p-3 dark:border-blue-950 dark:bg-blue-950/20">
                            <Label htmlFor="doctorId" className="flex items-center gap-1.5 text-xs font-semibold">
                                <Stethoscope className="h-3.5 w-3.5 text-primary" />
                                Link Doctor Practitioner *
                            </Label>
                            <Select
                                value={watch("doctorId") || ""}
                                onValueChange={(val) =>
                                    setValue("doctorId", val, { shouldValidate: true })
                                }
                                disabled={createMutation.isPending || isLoadingDoctors}
                            >
                                <SelectTrigger id="doctorId" className="w-full bg-background">
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

                    <DialogFooter className="pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={createMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={createMutation.isPending}>
                            {createMutation.isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Create User
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
