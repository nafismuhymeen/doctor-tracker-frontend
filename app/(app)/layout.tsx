import { AppLayout } from "@/components/layout/app-layout";
import { RequireRole } from "@/components/auth/require-role";

export default function AuthenticatedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <RequireRole>
            <AppLayout>{children}</AppLayout>
        </RequireRole>
    );
}

