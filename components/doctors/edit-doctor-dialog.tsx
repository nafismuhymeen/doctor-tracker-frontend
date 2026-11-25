"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Stethoscope, Loader2 } from "lucide-react";
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
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Doctor } from "@/types";

const editDoctorSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, "Doctor name must be at least 2 characters")
        .max(100, "Doctor name cannot exceed 100 characters"),
    specialization: z
        .string()
        .trim()
        .min(2, "Specialization is required")
        .max(100, "Specialization cannot exceed 100 characters"),
    hospital: z
        .string()
        .trim()
        .min(2, "Hospital name is required")
        .max(150, "Hospital name cannot exceed 150 characters"),
    phone: z
        .string()
        .trim()
        .min(7, "Please provide a valid phone number")
        .max(20, "Phone number cannot exceed 20 characters"),
    email: z
        .string()
        .trim()
        .email("Please provide a valid email address"),
});

type EditDoctorFormData = z.infer<typeof editDoctorSchema>;

interface EditDoctorDialogProps {
    doctor: Doctor | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditDoctorDialog({
    doctor,
    open,
    onOpenChange,
}: EditDoctorDialogProps) {
    const queryClient = useQueryClient();

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<EditDoctorFormData>({
        resolver: zodResolver(editDoctorSchema),
        defaultValues: {
            name: "",
            specialization: "",
            hospital: "",
            phone: "",
            email: "",
        },
    });

    useEffect(() => {
        if (doctor) {
            reset({
                name: doctor.name,
                specialization: doctor.specialization,
                hospital: doctor.hospital,
                phone: doctor.phone,
                email: doctor.email,
            });
        }
    }, [doctor, reset]);

    const updateMutation = useMutation({
        mutationFn: async (data: EditDoctorFormData) => {
            if (!doctor) throw new Error("No doctor selected");
            return api.patch(`/doctors/${doctor._id}`, data);
        },
        onSuccess: () => {
            toast.success("Doctor profile updated successfully");
            queryClient.invalidateQueries({ queryKey: qk.doctors.all() });
            onOpenChange(false);
        },
        onError: (err: unknown) => {
            if (err instanceof ApiError) {
                if (err.status === 409 || err.code === "EMAIL_IN_USE") {
                    toast.error("Update Failed", {
                        description: "A doctor with this email address already exists.",
                    });
                    return;
                }
                toast.error("Update Failed", { description: err.message });
            } else {
                toast.error("Update Failed", {
                    description: "An unexpected error occurred while updating the doctor.",
                });
            }
        },
    });

    if (!doctor) return null;

    const onSubmit = (data: EditDoctorFormData) => {
        updateMutation.mutate(data);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Stethoscope className="h-5 w-5 text-primary" />
                        Edit Doctor Profile
                    </DialogTitle>
                    <DialogDescription>
                        Update professional credentials and hospital affiliation for Dr. {doctor.name}.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
                    {/* Full Name */}
                    <div className="space-y-1.5">
                        <Label htmlFor="doc-edit-name">Doctor Name *</Label>
                        <Input
                            id="doc-edit-name"
                            disabled={updateMutation.isPending}
                            {...register("name")}
                        />
                        {errors.name && (
                            <p className="text-xs text-destructive">
                                {errors.name.message}
                            </p>
                        )}
                    </div>

                    {/* Specialization */}
                    <div className="space-y-1.5">
                        <Label htmlFor="doc-edit-specialization">Specialization *</Label>
                        <Input
                            id="doc-edit-specialization"
                            disabled={updateMutation.isPending}
                            {...register("specialization")}
                        />
                        {errors.specialization && (
                            <p className="text-xs text-destructive">
                                {errors.specialization.message}
                            </p>
                        )}
                    </div>

                    {/* Hospital */}
                    <div className="space-y-1.5">
                        <Label htmlFor="doc-edit-hospital">Hospital Affiliation *</Label>
                        <Input
                            id="doc-edit-hospital"
                            disabled={updateMutation.isPending}
                            {...register("hospital")}
                        />
                        {errors.hospital && (
                            <p className="text-xs text-destructive">
                                {errors.hospital.message}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Phone */}
                        <div className="space-y-1.5">
                            <Label htmlFor="doc-edit-phone">Phone Number *</Label>
                            <Input
                                id="doc-edit-phone"
                                disabled={updateMutation.isPending}
                                {...register("phone")}
                            />
                            {errors.phone && (
                                <p className="text-xs text-destructive">
                                    {errors.phone.message}
                                </p>
                            )}
                        </div>

                        {/* Email */}
                        <div className="space-y-1.5">
                            <Label htmlFor="doc-edit-email">Email Address *</Label>
                            <Input
                                id="doc-edit-email"
                                type="email"
                                disabled={updateMutation.isPending}
                                {...register("email")}
                            />
                            {errors.email && (
                                <p className="text-xs text-destructive">
                                    {errors.email.message}
                                </p>
                            )}
                        </div>
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

