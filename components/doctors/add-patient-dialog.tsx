"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserPlus, Loader2 } from "lucide-react";

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

const patientSchema = z.object({
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
    gender: z.enum(["male", "female", "other"], {
        message: "Gender must be male, female, or other",
    }),
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
        .min(2, "Condition is required")
        .max(150, "Condition cannot exceed 150 characters"),
});

export type PatientFormData = z.infer<typeof patientSchema>;

interface AddPatientDialogProps {
    doctorId: string;
    doctorName?: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AddPatientDialog({
    doctorId,
    doctorName,
    open,
    onOpenChange,
}: AddPatientDialogProps) {
    const queryClient = useQueryClient();

    const {
        register,
        handleSubmit,
        setValue,
        reset,
        formState: { errors },
    } = useForm<PatientFormData>({
        resolver: zodResolver(patientSchema),
        defaultValues: {
            name: "",
            age: 30,
            gender: "male",
            phone: "",
            email: "",
            condition: "",
        },
    });

    const addPatientMutation = useMutation({
        mutationFn: (data: PatientFormData) =>
            api.post(`/doctors/${doctorId}/patients`, data),
        onSuccess: () => {
            toast.success("Patient registered successfully", {
                description: doctorName
                    ? `Patient assigned to Dr. ${doctorName}`
                    : "Patient assigned successfully",
            });
            queryClient.invalidateQueries({
                queryKey: ["doctorPatients", doctorId],
            });
            queryClient.invalidateQueries({
                queryKey: ["doctor", doctorId],
            });
            queryClient.invalidateQueries({ queryKey: ["patients"] });
            queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
            reset();
            onOpenChange(false);
        },
        onError: (error: unknown) => {
            const message =
                error instanceof ApiError
                    ? error.message
                    : "Failed to add patient";
            toast.error("Error", { description: message });
        },
    });

    const onSubmit = (data: PatientFormData) => {
        addPatientMutation.mutate(data);
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(val) => {
                if (!val) reset();
                onOpenChange(val);
            }}
        >
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-xl flex items-center gap-2">
                        <UserPlus className="h-5 w-5 text-primary" />
                        Add New Patient
                    </DialogTitle>
                    <DialogDescription>
                        {doctorName
                            ? `Register a new patient under Dr. ${doctorName}.`
                            : "Register a new patient under this doctor."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="name" className="text-xs font-medium">
                                Patient Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="name"
                                placeholder="John Doe"
                                {...register("name")}
                            />
                            {errors.name && (
                                <p className="text-xs text-destructive">
                                    {errors.name.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="condition" className="text-xs font-medium">
                                Condition / Diagnosis <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="condition"
                                placeholder="e.g. Hypertension"
                                {...register("condition")}
                            />
                            {errors.condition && (
                                <p className="text-xs text-destructive">
                                    {errors.condition.message}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="age" className="text-xs font-medium">
                                Age <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="age"
                                type="number"
                                placeholder="45"
                                {...register("age", { valueAsNumber: true })}
                            />
                            {errors.age && (
                                <p className="text-xs text-destructive">
                                    {errors.age.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">
                                Gender <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                defaultValue="male"
                                onValueChange={(val: "male" | "female" | "other") =>
                                    setValue("gender", val)
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="male">Male</SelectItem>
                                    <SelectItem value="female">Female</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="phone" className="text-xs font-medium">
                                Phone Number <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="phone"
                                placeholder="+1 (555) 123-4567"
                                {...register("phone")}
                            />
                            {errors.phone && (
                                <p className="text-xs text-destructive">
                                    {errors.phone.message}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-xs font-medium">
                            Email Address <span className="text-muted-foreground text-[11px]">(Optional)</span>
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="patient@example.com"
                            {...register("email")}
                        />
                        {errors.email && (
                            <p className="text-xs text-destructive">
                                {errors.email.message}
                            </p>
                        )}
                    </div>

                    <DialogFooter className="pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={addPatientMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={addPatientMutation.isPending}
                            className="gap-2"
                        >
                            {addPatientMutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "Save Patient"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

