"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";

import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

const doctorSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, "Name must be at least 2 characters")
        .max(100, "Name cannot exceed 100 characters"),
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
        .min(7, "Phone number must be at least 7 characters")
        .max(20, "Phone number cannot exceed 20 characters"),
    email: z
        .string()
        .trim()
        .email("Please provide a valid email address")
        .toLowerCase(),
});

type DoctorFormData = z.infer<typeof doctorSchema>;

export function CreateDoctorDialog() {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<DoctorFormData>({
        resolver: zodResolver(doctorSchema),
        defaultValues: {
            name: "",
            specialization: "",
            hospital: "",
            phone: "",
            email: "",
        },
    });

    const createMutation = useMutation({
        mutationFn: (data: DoctorFormData) => api.post("/doctors", data),
        onSuccess: () => {
            toast.success("Doctor created successfully");
            queryClient.invalidateQueries({ queryKey: ["doctors"] });
            queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
            reset();
            setOpen(false);
        },
        onError: (error: any) => {
            const message =
                error instanceof ApiError
                    ? error.message
                    : "Failed to create doctor. Please check your inputs.";
            toast.error("Creation Failed", { description: message });
        },
    });

    const onSubmit = (data: DoctorFormData) => {
        createMutation.mutate(data);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 shadow-sm">
                    <Plus className="h-4 w-4" />
                    <span>Add Doctor</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>Add New Doctor</DialogTitle>
                    <DialogDescription>
                        Enter doctor's credentials and hospital affiliation.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
                    {/* Full Name */}
                    <div className="space-y-1.5">
                        <Label htmlFor="name">Doctor Name *</Label>
                        <Input
                            id="name"
                            placeholder="Dr. Sarah Johnson"
                            disabled={createMutation.isPending}
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
                        <Label htmlFor="specialization">Specialization *</Label>
                        <Input
                            id="specialization"
                            placeholder="e.g. Cardiology, Neurology, Pediatrics"
                            disabled={createMutation.isPending}
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
                        <Label htmlFor="hospital">Hospital / Clinic *</Label>
                        <Input
                            id="hospital"
                            placeholder="e.g. Metro General Hospital"
                            disabled={createMutation.isPending}
                            {...register("hospital")}
                        />
                        {errors.hospital && (
                            <p className="text-xs text-destructive">
                                {errors.hospital.message}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Phone */}
                        <div className="space-y-1.5">
                            <Label htmlFor="phone">Phone *</Label>
                            <Input
                                id="phone"
                                placeholder="+1 (555) 000-1122"
                                disabled={createMutation.isPending}
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
                            <Label htmlFor="email">Email *</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="doctor@hospital.com"
                                disabled={createMutation.isPending}
                                {...register("email")}
                            />
                            {errors.email && (
                                <p className="text-xs text-destructive">
                                    {errors.email.message}
                                </p>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={createMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={createMutation.isPending}>
                            {createMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "Save Doctor"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

