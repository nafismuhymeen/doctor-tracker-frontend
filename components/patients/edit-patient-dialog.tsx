"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { Patient } from "@/types";

const editPatientSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, "Patient name must be at least 2 characters")
        .max(100, "Patient name cannot exceed 100 characters"),
    age: z
        .number({ message: "Age is required" })
        .int("Age must be an integer")
        .min(0, "Age cannot be negative")
        .max(130, "Age cannot exceed 130"),
    gender: z.enum(["male", "female", "other"]),
    phone: z
        .string()
        .trim()
        .min(7, "Phone number must be at least 7 characters")
        .max(20, "Phone number cannot exceed 20 characters"),
    email: z
        .string()
        .trim()
        .email("Please provide a valid email address")
        .toLowerCase()
        .optional()
        .or(z.literal("")),
    condition: z
        .string()
        .trim()
        .min(2, "Condition must be at least 2 characters")
        .max(150, "Condition cannot exceed 150 characters"),
});

type EditPatientFormData = z.infer<typeof editPatientSchema>;

interface EditPatientDialogProps {
    patient: Patient | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditPatientDialog({
    patient,
    open,
    onOpenChange,
}: EditPatientDialogProps) {
    const queryClient = useQueryClient();

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        formState: { errors },
    } = useForm<EditPatientFormData>({
        resolver: zodResolver(editPatientSchema),
    });

    useEffect(() => {
        if (patient) {
            reset({
                name: patient.name,
                age: patient.age,
                gender: patient.gender,
                phone: patient.phone,
                email: patient.email || "",
                condition: patient.condition,
            });
        }
    }, [patient, reset]);

    const updateMutation = useMutation({
        mutationFn: (data: EditPatientFormData) =>
            api.patch(`/patients/${patient?._id}`, data),
        onSuccess: () => {
            toast.success("Patient information updated successfully");
            queryClient.invalidateQueries({ queryKey: ["patients"] });
            queryClient.invalidateQueries({ queryKey: ["doctorPatients"] });
            queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
            onOpenChange(false);
        },
        onError: (error: any) => {
            const message =
                error instanceof ApiError
                    ? error.message
                    : "Failed to update patient information";
            toast.error("Update Failed", { description: message });
        },
    });

    if (!patient) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>Edit Patient Information</DialogTitle>
                    <DialogDescription>
                        Update details and diagnosis for {patient.name}.
                    </DialogDescription>
                </DialogHeader>

                <form
                    onSubmit={handleSubmit((d: EditPatientFormData) =>
                        updateMutation.mutate(d)
                    )}
                    className="space-y-4 py-2"
                >
                    <div className="space-y-1.5">
                        <Label htmlFor="edit-name">Patient Name *</Label>
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

                    <div className="space-y-1.5">
                        <Label htmlFor="edit-condition">
                            Condition / Medical Diagnosis *
                        </Label>
                        <Input
                            id="edit-condition"
                            disabled={updateMutation.isPending}
                            {...register("condition")}
                        />
                        {errors.condition && (
                            <p className="text-xs text-destructive">
                                {errors.condition.message}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="edit-age">Age *</Label>
                            <Input
                                id="edit-age"
                                type="number"
                                disabled={updateMutation.isPending}
                                {...register("age", { valueAsNumber: true })}
                            />
                            {errors.age && (
                                <p className="text-xs text-destructive">
                                    {errors.age.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="edit-gender">Gender *</Label>
                            <Select
                                defaultValue={patient.gender}
                                onValueChange={(val: "male" | "female" | "other") =>
                                    setValue("gender", val)
                                }
                            >
                                <SelectTrigger id="edit-gender" className="h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="male">Male</SelectItem>
                                    <SelectItem value="female">Female</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="edit-phone">Phone *</Label>
                            <Input
                                id="edit-phone"
                                disabled={updateMutation.isPending}
                                {...register("phone")}
                            />
                            {errors.phone && (
                                <p className="text-xs text-destructive">
                                    {errors.phone.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="edit-email">Email (Optional)</Label>
                            <Input
                                id="edit-email"
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

                    <DialogFooter className="pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={updateMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={updateMutation.isPending}
                        >
                            {updateMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                "Update Patient"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
