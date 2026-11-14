import { describe, it, expect } from "vitest";
import { ApiError } from "@/lib/api";
import { getLoginErrorMessage, loginSchema, sanitizeNextUrl } from "@/app/login/page";

describe("Login Error Message Formatter", () => {
    it("maps ACCOUNT_DISABLED code to clear explanation", () => {
        const error = new ApiError("Account inactive", 403, "ACCOUNT_DISABLED");
        expect(getLoginErrorMessage(error)).toBe(
            "This account has been disabled. Contact an administrator."
        );
    });

    it("maps INVALID_CREDENTIALS code to credential error message", () => {
        const error = new ApiError("Bad creds", 401, "INVALID_CREDENTIALS");
        expect(getLoginErrorMessage(error)).toBe("Invalid email or password.");
    });

    it("maps generic 401 status to credential error message", () => {
        const error = new ApiError("Unauthorized", 401);
        expect(getLoginErrorMessage(error)).toBe("Invalid email or password.");
    });

    it("maps 429 rate limit error to cooldown guidance", () => {
        const error = new ApiError("Rate limit exceeded", 429, "RATE_LIMIT_EXCEEDED");
        expect(getLoginErrorMessage(error)).toBe(
            "Too many sign-in attempts. Please wait a moment and try again."
        );
    });

    it("maps status 0 network error to connection guidance", () => {
        const error = new ApiError("Network request failed", 0, "NETWORK_ERROR");
        expect(getLoginErrorMessage(error)).toBe(
            "Cannot reach the server. Please check your connection."
        );
    });

    it("falls back to custom message or generic fallback for other errors", () => {
        const customError = new ApiError("Custom service failure", 500);
        expect(getLoginErrorMessage(customError)).toBe("Custom service failure");

        expect(getLoginErrorMessage(new Error("Boom"))).toBe(
            "Unable to sign in. Please verify your credentials."
        );
        expect(getLoginErrorMessage(null)).toBe(
            "Unable to sign in. Please verify your credentials."
        );
    });
});

describe("Login Schema Validation", () => {
    it("accepts valid email and password", () => {
        const result = loginSchema.safeParse({
            email: "admin@example.com",
            password: "Password123!",
        });
        expect(result.success).toBe(true);
    });

    it("rejects invalid email formats", () => {
        const result = loginSchema.safeParse({
            email: "not-an-email",
            password: "Password123!",
        });
        expect(result.success).toBe(false);
    });

    it("rejects empty password", () => {
        const result = loginSchema.safeParse({
            email: "admin@example.com",
            password: "",
        });
        expect(result.success).toBe(false);
    });
});

describe("sanitizeNextUrl", () => {
    it("permits valid relative destination paths", () => {
        expect(sanitizeNextUrl("/dashboard")).toBe("/dashboard");
        expect(sanitizeNextUrl("/patients")).toBe("/patients");
        expect(sanitizeNextUrl("/doctors/doc-123?tab=schedule")).toBe(
            "/doctors/doc-123?tab=schedule"
        );
    });

    it("rejects protocol-relative urls starting with //", () => {
        expect(sanitizeNextUrl("//evil.com")).toBe(null);
        expect(sanitizeNextUrl("//evil.com/phish")).toBe(null);
    });

    it("rejects backslash-containing bypass attempts", () => {
        expect(sanitizeNextUrl("/\\evil.com")).toBe(null);
        expect(sanitizeNextUrl("/doctors\\evil")).toBe(null);
        expect(sanitizeNextUrl("\\evil.com")).toBe(null);
    });

    it("rejects absolute or protocol URLs", () => {
        expect(sanitizeNextUrl("https://evil.com")).toBe(null);
        expect(sanitizeNextUrl("http://evil.com")).toBe(null);
        expect(sanitizeNextUrl("javascript:alert(1)")).toBe(null);
    });

    it("rejects any whitespace or control characters", () => {
        expect(sanitizeNextUrl("\t/patients")).toBe(null);
        expect(sanitizeNextUrl("/patients\t")).toBe(null);
        expect(sanitizeNextUrl("/patients\n")).toBe(null);
        expect(sanitizeNextUrl("/patients\r\n")).toBe(null);
        expect(sanitizeNextUrl("/patients with space")).toBe(null);
        expect(sanitizeNextUrl("/doctors ")).toBe(null);
        expect(sanitizeNextUrl("/\0evil")).toBe(null);
        expect(sanitizeNextUrl("/\u001Ftest")).toBe(null);
    });

    it("returns null for empty, null, or undefined values", () => {
        expect(sanitizeNextUrl("")).toBe(null);
        expect(sanitizeNextUrl(null)).toBe(null);
        expect(sanitizeNextUrl(undefined)).toBe(null);
    });
});
