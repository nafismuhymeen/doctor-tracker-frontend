import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import "./globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Doctor Tracker – Healthcare Management Portal",
    description:
        "Administrative healthcare web application to manage doctors, patients, and view analytics.",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning className="h-full">
            <body
                className={`${geistSans.variable} ${geistMono.variable} min-h-full font-sans antialiased`}
            >
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <QueryProvider>
                        <Suspense fallback={null}>
                            <AuthProvider>
                                {children}
                                <Toaster position="top-right" richColors />
                            </AuthProvider>
                        </Suspense>
                    </QueryProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
