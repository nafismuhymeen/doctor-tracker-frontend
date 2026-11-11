"use client";

import React, { createContext, useContext, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, setSessionExpiredHandler } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { can as canPermission, type Action, type PermissionContext } from "@/lib/permissions";
import type { User, Role, ApiResponse } from "@/types";

interface AuthContextType {
    user: User | null;
    role: Role | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (user: User, redirectTo?: string) => void;
    logout: () => Promise<void>;
    logoutAll: () => Promise<void>;
    can: (action: Action, ctx?: PermissionContext) => boolean;
    // Legacy compatibility alias
    admin: User | null;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    role: null,
    isLoading: true,
    isAuthenticated: false,
    login: () => {},
    logout: async () => {},
    logoutAll: async () => {},
    can: () => false,
    admin: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const queryClient = useQueryClient();
    const router = useRouter();

    const { data: response, isLoading } = useQuery({
        queryKey: qk.auth.me(),
        queryFn: () => api.get<ApiResponse<{ user: User }>>("/auth/me"),
        retry: false,
        refetchOnWindowFocus: false,
        staleTime: Infinity,
    });

    const user = response?.data?.user ?? null;
    const role = user?.role ?? null;
    const isAuthenticated = !!user;

    const logout = useCallback(async () => {
        try {
            await api.post("/auth/logout");
        } catch {
            // Ignore failure on logout call
        } finally {
            queryClient.clear();
            router.push("/login");
        }
    }, [queryClient, router]);

    const logoutAll = useCallback(async () => {
        try {
            await api.post("/auth/logout-all");
        } catch {
            // Ignore failure on logoutAll call
        } finally {
            queryClient.clear();
            router.push("/login");
        }
    }, [queryClient, router]);

    // Handle mid-use session revocation/termination
    useEffect(() => {
        setSessionExpiredHandler((message: string) => {
            toast.error(message);
            queryClient.clear();
            router.push("/login");
        });

        return () => {
            setSessionExpiredHandler(null);
        };
    }, [queryClient, router]);

    const login = useCallback(
        (newUser: User, redirectTo?: string) => {
            queryClient.setQueryData(qk.auth.me(), {
                success: true,
                message: "Current user retrieved successfully",
                data: { user: newUser },
            });

            // Target destination by role or explicit redirectTo
            if (redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")) {
                router.push(redirectTo);
            } else {
                router.push("/dashboard");
            }
        },
        [queryClient, router]
    );

    const can = useCallback(
        (action: Action, ctx?: PermissionContext) => {
            return canPermission(role, action, {
                ...ctx,
                doctorId: user?.doctorId,
            });
        },
        [role, user?.doctorId]
    );

    return (
        <AuthContext.Provider
            value={{
                user,
                role,
                isLoading,
                isAuthenticated,
                login,
                logout,
                logoutAll,
                can,
                admin: user,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
