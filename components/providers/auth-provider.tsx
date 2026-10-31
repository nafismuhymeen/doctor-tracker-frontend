"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import type { Admin, ApiResponse } from "@/types";

interface AuthContextType {
    admin: Admin | null;
    isLoading: boolean;
    login: (admin: Admin) => void;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    admin: null,
    isLoading: true,
    login: () => {},
    logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [admin, setAdmin] = useState<Admin | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        let isMounted = true;

        async function verifyAuth() {
            try {
                const response = await api.get<ApiResponse<{ admin: Admin }>>(
                    "/auth/me"
                );
                if (isMounted && response.data?.admin) {
                    setAdmin(response.data.admin);
                }
            } catch {
                if (isMounted) {
                    setAdmin(null);
                    if (pathname !== "/login") {
                        router.push("/login");
                    }
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        verifyAuth();

        return () => {
            isMounted = false;
        };
    }, [pathname, router]);

    const login = (newAdmin: Admin) => {
        setAdmin(newAdmin);
        router.push("/dashboard");
    };

    const logout = async () => {
        try {
            await api.post("/auth/logout");
        } catch {
            // ignore logout error
        } finally {
            setAdmin(null);
            router.push("/login");
        }
    };

    return (
        <AuthContext.Provider value={{ admin, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);

