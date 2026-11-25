"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusCircle, Loader2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface AddAddendumDialogProps {
    visitId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function AddAddendumDialog({
    visitId,
    open,
    onOpenChange,
    onSuccess,
}: AddAddendumDialogProps) {
    const queryClient = useQueryClient();
    const [text, setText] = useState("");
    const [error, setError] = useState<string | null>(null);

    const mutation = useMutation({
        mutationFn: async (addendumText: string) => {
            if (!visitId) throw new Error("No visit selected");
            return api.post(`/visits/${visitId}/addenda`, { text: addendumText.trim() });
        },
        onSuccess: () => {
            toast.success("Addendum added", {
                description: "The addendum has been permanently recorded to the clinical visit.",
            });
            queryClient.invalidateQueries({ queryKey: qk.visits.all() });
            queryClient.invalidateQueries({ queryKey: qk.patients.all() });
            setText("");
            setError(null);
            onOpenChange(false);
            onSuccess?.();
        },
        onError: (err: unknown) => {
            if (err instanceof ApiError) {
                setError(err.message);
                toast.error("Failed to add addendum", { description: err.message });
            } else {
                setError("An unexpected error occurred");
                toast.error("Failed to add addendum", {
                    description: "An unexpected error occurred. Please try again.",
                });
            }
        },
    });

    const handleClose = (newOpen: boolean) => {
        if (!newOpen) {
            setText("");
            setError(null);
        }
        onOpenChange(newOpen);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = text.trim();
        if (!trimmed) {
            setError("Addendum text is required");
            return;
        }
        if (trimmed.length > 2000) {
            setError("Addendum cannot exceed 2000 characters");
            return;
        }
        setError(null);
        mutation.mutate(trimmed);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <PlusCircle className="h-5 w-5 text-primary" />
                        Add Clinical Addendum
                    </DialogTitle>
                    <DialogDescription>
                        Addenda are append-only and cannot be edited or deleted once saved. They form an immutable part of the patient&apos;s medical record.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="addendum-text">Addendum Notes</Label>
                            <span
                                className={`text-xs ${
                                    text.length > 2000
                                        ? "text-destructive font-medium"
                                        : "text-muted-foreground"
                                }`}
                            >
                                {text.length}/2000
                            </span>
                        </div>
                        <Textarea
                            id="addendum-text"
                            placeholder="Enter additional clinical observations, correction, or clarification..."
                            value={text}
                            onChange={(e) => {
                                setText(e.target.value);
                                if (error) setError(null);
                            }}
                            rows={5}
                            maxLength={2000}
                            className="resize-none"
                            autoFocus
                        />
                        {error && (
                            <p className="text-xs text-destructive font-medium">{error}</p>
                        )}
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleClose(false)}
                            disabled={mutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={mutation.isPending || !text.trim() || text.length > 2000}
                        >
                            {mutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Recording...
                                </>
                            ) : (
                                "Record Addendum"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

