"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
    Users,
    UserPlus,
    Trash2,
    Loader2,
    Phone,
    Mail,
    HeartPulse,
} from "lucide-react";

import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApiResponse, Doctor, Patient, PatientsResponse } from "@/types";

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

type PatientFormData = z.infer<typeof patientSchema>;

interface DoctorPatientsDialogProps {
    doctor: Doctor | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function DoctorPatientsDialog({
    doctor,
    open,
    onOpenChange,
}: DoctorPatientsDialogProps) {
    const queryClient = useQueryClient();
    const [showAddForm, setShowAddForm] = useState(false);
    const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);

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

    // Query patients under this doctor
    const {
        data: response,
        isLoading,
    } = useQuery({
        queryKey: ["doctorPatients", doctor?._id],
        queryFn: () =>
            api.get<ApiResponse<PatientsResponse>>(
                `/doctors/${doctor?._id}/patients?limit=50`
            ),
        enabled: !!doctor?._id && open,
    });

    const patients = response?.data?.patients || [];

    // Mutation: Add patient under doctor
    const addPatientMutation = useMutation({
        mutationFn: (data: PatientFormData) =>
            api.post(`/doctors/${doctor?._id}/patients`, data),
        onSuccess: () => {
            toast.success("Patient registered under doctor successfully");
            queryClient.invalidateQueries({
                queryKey: ["doctorPatients", doctor?._id],
            });
            queryClient.invalidateQueries({ queryKey: ["patients"] });
            queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
            reset();
            setShowAddForm(false);
        },
        onError: (error: any) => {
            const message =
                error instanceof ApiError
                    ? error.message
                    : "Failed to add patient";
            toast.error("Error", { description: message });
        },
    });

    // Mutation: Delete patient from doctor's list
    const deletePatientMutation = useMutation({
        mutationFn: (patientId: string) =>
            api.delete(`/doctors/${doctor?._id}/patients/${patientId}`),
        onSuccess: () => {
            toast.success("Patient removed from doctor successfully");
            queryClient.invalidateQueries({
                queryKey: ["doctorPatients", doctor?._id],
            });
            queryClient.invalidateQueries({ queryKey: ["patients"] });
            queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
            setPatientToDelete(null);
        },
        onError: (error: any) => {
            const message =
                error instanceof ApiError
                    ? error.message
                    : "Failed to remove patient";
            toast.error("Error", { description: message });
            setPatientToDelete(null);
        },
    });

    if (!doctor) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader className="border-b pb-4">
                    <div className="flex items-start justify-between">
                        <div>
                            <DialogTitle className="text-xl flex items-center gap-2">
                                <Users className="h-5 w-5 text-primary" />
                                {doctor.name}'s Patients
                            </DialogTitle>
                            <DialogDescription className="mt-1">
                                {doctor.specialization} • {doctor.hospital}
                            </DialogDescription>
                        </div>
                        <Button
                            size="sm"
                            variant={showAddForm ? "outline" : "default"}
                            className="gap-1.5"
                            onClick={() => setShowAddForm(!showAddForm)}
                        >
                            <UserPlus className="h-4 w-4" />
                            {showAddForm ? "Close Form" : "Add Patient"}
                        </Button>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto pr-1 py-3 space-y-4">
                    {/* Add Patient under Doctor Accordion / Form */}
                    {showAddForm && (
                        <div className="rounded-lg border bg-muted/30 p-4 space-y-3 animate-in fade-in-50">
                            <h4 className="text-sm font-semibold flex items-center gap-2">
                                <HeartPulse className="h-4 w-4 text-primary" />
                                Register New Patient Under {doctor.name}
                            </h4>
                            <form
                                onSubmit={handleSubmit((d: PatientFormData) =>
                                    addPatientMutation.mutate(d)
                                )}
                                className="space-y-3"
                            >
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Patient Name *</Label>
                                        <Input
                                            placeholder="John Doe"
                                            {...register("name")}
                                        />
                                        {errors.name && (
                                            <p className="text-xs text-destructive">
                                                {errors.name.message}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-xs">Condition / Diagnosis *</Label>
                                        <Input
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
                                    <div className="space-y-1">
                                        <Label className="text-xs">Age *</Label>
                                        <Input
                                            type="number"
                                            placeholder="45"
                                            {...register("age", {
                                                valueAsNumber: true,
                                            })}
                                        />
                                        {errors.age && (
                                            <p className="text-xs text-destructive">
                                                {errors.age.message}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-xs">Gender *</Label>
                                        <Select
                                            defaultValue="male"
                                            onValueChange={(val: "male" | "female" | "other") =>
                                                setValue("gender", val)
                                            }
                                        >
                                            <SelectTrigger className="h-9">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="male">Male</SelectItem>
                                                <SelectItem value="female">Female</SelectItem>
                                                <SelectItem value="other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-xs">Phone *</Label>
                                        <Input
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

                                <div className="space-y-1">
                                    <Label className="text-xs">Email (Optional)</Label>
                                    <Input
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

                                <div className="flex justify-end gap-2 pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowAddForm(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        size="sm"
                                        disabled={addPatientMutation.isPending}
                                    >
                                        {addPatientMutation.isPending ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            "Save Patient"
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Patient List */}
                    {isLoading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                        </div>
                    ) : patients.length === 0 ? (
                        <div className="text-center py-12 border rounded-lg border-dashed">
                            <Users className="mx-auto h-8 w-8 text-muted-foreground/60" />
                            <p className="mt-2 text-sm font-medium">No patients found</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Click "Add Patient" above to assign a patient to {doctor.name}.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {patients.map((patient: Patient) => (
                                <div
                                    key={patient._id}
                                    className="flex items-center justify-between rounded-lg border bg-card p-3 shadow-xs hover:border-primary/40 transition-colors"
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-sm">
                                                {patient.name}
                                            </span>
                                            <Badge variant="outline" className="text-[11px] capitalize">
                                                {patient.gender}, {patient.age} yrs
                                            </Badge>
                                            <Badge variant="info" className="text-[11px]">
                                                {patient.condition}
                                            </Badge>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Phone className="h-3 w-3" />
                                                {patient.phone}
                                            </span>
                                            {patient.email && (
                                                <span className="flex items-center gap-1">
                                                    <Mail className="h-3 w-3" />
                                                    {patient.email}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                        disabled={
                                            deletePatientMutation.isPending &&
                                            patientToDelete?._id === patient._id
                                        }
                                        onClick={() => setPatientToDelete(patient)}
                                        title="Delete patient from doctor's list"
                                    >
                                        {deletePatientMutation.isPending &&
                                        patientToDelete?._id === patient._id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>

            {/* Remove Patient Alert Dialog */}
            <AlertDialog
                open={!!patientToDelete}
                onOpenChange={(open) => {
                    if (!open) setPatientToDelete(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Patient</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove patient{" "}
                            <span className="font-semibold text-foreground">
                                {patientToDelete?.name}
                            </span>{" "}
                            from {doctor.name}&apos;s roster?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deletePatientMutation.isPending}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                if (patientToDelete) {
                                    deletePatientMutation.mutate(patientToDelete._id);
                                }
                            }}
                            disabled={deletePatientMutation.isPending}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deletePatientMutation.isPending ? "Removing..." : "Remove Patient"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Dialog>
    );
}
