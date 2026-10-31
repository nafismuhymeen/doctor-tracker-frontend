const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

export class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
        this.name = "ApiError";
    }
}

async function request<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${API_URL}${endpoint}`;

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
    };

    const response = await fetch(url, {
        ...options,
        headers,
        credentials: "include", // Send httpOnly cookies
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        const errorMessage =
            data?.message ||
            (data?.errors && Array.isArray(data.errors)
                ? data.errors.map((e: any) => e.message).join(", ")
                : "An unexpected error occurred");

        throw new ApiError(errorMessage, response.status);
    }

    return data;
}

export const api = {
    get: <T>(endpoint: string, options?: RequestInit) =>
        request<T>(endpoint, { method: "GET", ...options }),

    post: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
        request<T>(endpoint, {
            method: "POST",
            body: body ? JSON.stringify(body) : undefined,
            ...options,
        }),

    patch: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
        request<T>(endpoint, {
            method: "PATCH",
            body: body ? JSON.stringify(body) : undefined,
            ...options,
        }),

    delete: <T>(endpoint: string, options?: RequestInit) =>
        request<T>(endpoint, { method: "DELETE", ...options }),
};

