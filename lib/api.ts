export const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "/api/v1";

export interface ApiFieldError {
    path?: string;
    message: string;
}

export class ApiError extends Error {
    status: number;
    code?: string;
    fieldErrors?: ApiFieldError[];

    constructor(
        message: string,
        status: number,
        code?: string,
        fieldErrors?: ApiFieldError[]
    ) {
        super(message);
        this.status = status;
        this.code = code;
        this.fieldErrors = fieldErrors;
        this.name = "ApiError";
    }
}

type SessionExpiredHandler = (message: string) => void;
let onSessionExpired: SessionExpiredHandler | null = null;

export function setSessionExpiredHandler(handler: SessionExpiredHandler | null) {
    onSessionExpired = handler;
}

interface RequestOptions extends RequestInit {
    _isRetry?: boolean;
}

let refreshPromise: Promise<boolean> | null = null;

const AUTH_EXEMPT_PATHS = [
    "/auth/login",
    "/auth/refresh",
    "/auth/logout",
    "/auth/logout-all",
];

async function rawFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${API_URL}${endpoint}`;
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
    };

    try {
        return await fetch(url, {
            ...options,
            headers,
            credentials: "include",
        });
    } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
            throw err;
        }
        throw new ApiError(
            "Unable to connect to the server. Please check your network connection.",
            0
        );
    }
}

async function performTokenRefresh(): Promise<boolean> {
    try {
        const response = await rawFetch("/auth/refresh", { method: "POST" });
        if (response.ok) {
            return true;
        }

        const data = await response.json().catch(() => null);

        // 409 TOKEN_ROTATED: Another tab rotated the token within the grace window.
        // The rotated cookies are in the browser jar. Do not log out; retry once!
        if (response.status === 409 && data?.code === "TOKEN_ROTATED") {
            return true;
        }

        if (
            response.status === 401 &&
            (data?.code === "SESSION_REVOKED" || data?.code === "SESSION_TERMINATED")
        ) {
            if (onSessionExpired) {
                onSessionExpired("Your session expired, please sign in again");
            } else if (typeof window !== "undefined") {
                // Fallback hard redirect if no auth context is active
                // eslint-disable-next-line @next/next/no-location-assign-relative-destination
                window.location.assign("/login");
            }
            return false;
        }

        return false;
    } catch {
        return false;
    } finally {
        refreshPromise = null;
    }
}

interface RawErrorPayload {
    message?: string;
    code?: string;
    errors?: Array<{ path?: string | string[]; message?: string }>;
}

async function request<T>(
    endpoint: string,
    options: RequestOptions = {}
): Promise<T> {
    const response = await rawFetch(endpoint, options);

    // Check for 401 and attempt single-flight token refresh
    const isAuthExempt = AUTH_EXEMPT_PATHS.some((path) => endpoint.startsWith(path));
    if (response.status === 401 && !isAuthExempt && !options._isRetry) {
        if (!refreshPromise) {
            refreshPromise = performTokenRefresh();
        }
        const refreshed = await refreshPromise;
        if (refreshed) {
            return request<T>(endpoint, { ...options, _isRetry: true });
        }
    }

    if (response.status === 429) {
        throw new ApiError(
            "Too many attempts, try again later.",
            429,
            "RATE_LIMIT_EXCEEDED"
        );
    }

    let data: (Record<string, unknown> & RawErrorPayload) | null = null;
    const contentType = response.headers.get("content-type");
    if (response.status !== 204 && contentType && contentType.includes("application/json")) {
        data = await response.json().catch(() => null);
    } else if (response.status !== 204) {
        const text = await response.text().catch(() => null);
        data = text ? { message: text } : null;
    }

    if (!response.ok) {
        const fieldErrors = Array.isArray(data?.errors)
            ? data.errors.map((e) => ({
                  path: Array.isArray(e.path) ? e.path.join(".") : e.path,
                  message: e.message || String(e),
              }))
            : undefined;

        const errorMessage =
            data?.message ||
            (fieldErrors && fieldErrors.length > 0
                ? fieldErrors.map((e: ApiFieldError) => e.message).join(", ")
                : "An unexpected error occurred");

        throw new ApiError(
            errorMessage,
            response.status,
            data?.code,
            fieldErrors
        );
    }

    return data as T;
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
