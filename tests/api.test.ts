import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api, ApiError, setSessionExpiredHandler } from "@/lib/api";

describe("API Client (lib/api.ts)", () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        global.fetch = originalFetch;
        setSessionExpiredHandler(null);
    });

    it("successfully parses JSON on a 200 response", async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            headers: new Headers({ "content-type": "application/json" }),
            json: async () => ({ success: true, data: { id: "123" } }),
        });

        const result = await api.get<{ success: boolean; data: { id: string } }>("/test");
        expect(result.data.id).toBe("123");
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("throws an ApiError with status 0 on network disconnect", async () => {
        global.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

        await expect(api.get("/network-fail")).rejects.toThrowError(ApiError);
        try {
            await api.get("/network-fail");
        } catch (err: unknown) {
            expect((err as ApiError).status).toBe(0);
        }
    });

    it("throws an ApiError with status 429 on rate limit", async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 429,
            headers: new Headers({ "content-type": "application/json" }),
            json: async () => ({ code: "RATE_LIMIT_EXCEEDED" }),
        });

        await expect(api.get("/busy")).rejects.toThrowError(ApiError);
        try {
            await api.get("/busy");
        } catch (err: unknown) {
            expect((err as ApiError).status).toBe(429);
            expect((err as ApiError).code).toBe("RATE_LIMIT_EXCEEDED");
        }
    });

    it("automatically refreshes token on 401 and retries original request", async () => {
        let calls = 0;
        global.fetch = vi.fn().mockImplementation((url: string) => {
            calls++;
            if (url.endsWith("/data")) {
                if (calls === 1) {
                    return Promise.resolve({
                        ok: false,
                        status: 401,
                        headers: new Headers({ "content-type": "application/json" }),
                        json: async () => ({ message: "Access token expired" }),
                    });
                }
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    headers: new Headers({ "content-type": "application/json" }),
                    json: async () => ({ success: true, payload: "recovered" }),
                });
            }
            if (url.endsWith("/auth/refresh")) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    headers: new Headers({ "content-type": "application/json" }),
                    json: async () => ({ success: true }),
                });
            }
            return Promise.reject(new Error("Unexpected endpoint"));
        });

        const res = await api.get<{ success: boolean; payload: string }>("/data");
        expect(res.payload).toBe("recovered");
        // Calls: 1st /data (401), /auth/refresh (200), 2nd /data (200)
        expect(calls).toBe(3);
    });

    it("retries request when token refresh returns 409 TOKEN_ROTATED (multi-tab race)", async () => {
        let calls = 0;
        global.fetch = vi.fn().mockImplementation((url: string) => {
            calls++;
            if (url.endsWith("/protected")) {
                if (calls === 1) {
                    return Promise.resolve({
                        ok: false,
                        status: 401,
                        headers: new Headers({ "content-type": "application/json" }),
                        json: async () => ({ message: "Access token expired" }),
                    });
                }
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    headers: new Headers({ "content-type": "application/json" }),
                    json: async () => ({ success: true, item: "saved" }),
                });
            }
            if (url.endsWith("/auth/refresh")) {
                return Promise.resolve({
                    ok: false,
                    status: 409,
                    headers: new Headers({ "content-type": "application/json" }),
                    json: async () => ({ code: "TOKEN_ROTATED" }),
                });
            }
            return Promise.reject(new Error("Unexpected endpoint"));
        });

        const res = await api.get<{ success: boolean; item: string }>("/protected");
        expect(res.item).toBe("saved");
    });

    it("triggers onSessionExpired handler when refresh reports SESSION_REVOKED", async () => {
        const sessionExpiredMock = vi.fn();
        setSessionExpiredHandler(sessionExpiredMock);

        global.fetch = vi.fn().mockImplementation((url: string) => {
            if (url.endsWith("/secure-info")) {
                return Promise.resolve({
                    ok: false,
                    status: 401,
                    headers: new Headers({ "content-type": "application/json" }),
                    json: async () => ({ message: "Unauthorized" }),
                });
            }
            if (url.endsWith("/auth/refresh")) {
                return Promise.resolve({
                    ok: false,
                    status: 401,
                    headers: new Headers({ "content-type": "application/json" }),
                    json: async () => ({ code: "SESSION_REVOKED" }),
                });
            }
            return Promise.reject(new Error("Unexpected endpoint"));
        });

        await expect(api.get("/secure-info")).rejects.toThrow();
        expect(sessionExpiredMock).toHaveBeenCalledWith(
            "Your session expired, please sign in again"
        );
    });

    it("single-flights concurrent 401 token refreshes", async () => {
        let refreshCalls = 0;
        let data1Calls = 0;
        let data2Calls = 0;

        global.fetch = vi.fn().mockImplementation(async (url: string) => {
            if (url.endsWith("/data1")) {
                data1Calls++;
                if (data1Calls === 1) {
                    return {
                        ok: false,
                        status: 401,
                        headers: new Headers({ "content-type": "application/json" }),
                        json: async () => ({ message: "Expired" }),
                    };
                }
                return {
                    ok: true,
                    status: 200,
                    headers: new Headers({ "content-type": "application/json" }),
                    json: async () => ({ source: "d1" }),
                };
            }
            if (url.endsWith("/data2")) {
                data2Calls++;
                if (data2Calls === 1) {
                    return {
                        ok: false,
                        status: 401,
                        headers: new Headers({ "content-type": "application/json" }),
                        json: async () => ({ message: "Expired" }),
                    };
                }
                return {
                    ok: true,
                    status: 200,
                    headers: new Headers({ "content-type": "application/json" }),
                    json: async () => ({ source: "d2" }),
                };
            }
            if (url.endsWith("/auth/refresh")) {
                refreshCalls++;
                // Add slight artificial delay to ensure concurrency overlap
                await new Promise((r) => setTimeout(r, 20));
                return {
                    ok: true,
                    status: 200,
                    headers: new Headers({ "content-type": "application/json" }),
                    json: async () => ({ success: true }),
                };
            }
            return Promise.reject(new Error("Unknown endpoint"));
        });

        const [r1, r2] = await Promise.all([
            api.get<{ source: string }>("/data1"),
            api.get<{ source: string }>("/data2"),
        ]);

        expect(r1.source).toBe("d1");
        expect(r2.source).toBe("d2");
        expect(refreshCalls).toBe(1); // Single flight!
    });
});

