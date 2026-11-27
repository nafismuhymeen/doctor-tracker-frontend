import { describe, it, expect, afterEach } from "vitest";
import nextConfig from "../next.config";

describe("Security Headers Configuration in next.config.ts", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
  });

  it("configures security headers for all paths (/:path*)", async () => {
    expect(nextConfig.headers).toBeDefined();
    if (!nextConfig.headers) return;

    const routes = await nextConfig.headers();
    expect(routes).toHaveLength(1);
    expect(routes[0].source).toBe("/:path*");

    const headerMap = new Map(routes[0].headers.map((h) => [h.key, h.value]));

    // 1. X-Content-Type-Options
    expect(headerMap.get("X-Content-Type-Options")).toBe("nosniff");

    // 2. X-Frame-Options
    expect(headerMap.get("X-Frame-Options")).toBe("DENY");

    // 3. Referrer-Policy
    expect(headerMap.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");

    // 4. Permissions-Policy
    expect(headerMap.get("Permissions-Policy")).toBe(
      "camera=(), microphone=(), geolocation=(), payment=()"
    );

    // 5. Content Security Policy
    const csp = headerMap.get("Content-Security-Policy") || headerMap.get("Content-Security-Policy-Report-Only");
    expect(csp).toBeDefined();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("img-src 'self' data: blob:");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("font-src 'self' data:");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
  });

  it("includes Strict-Transport-Security when in production", async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    if (!nextConfig.headers) return;

    const routes = await nextConfig.headers();
    const headerMap = new Map(routes[0].headers.map((h) => [h.key, h.value]));

    expect(headerMap.get("Strict-Transport-Security")).toBe(
      "max-age=63072000; includeSubDomains"
    );
  });

  it("omits Strict-Transport-Security in non-production environments and adds 'unsafe-eval' for dev", async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    if (!nextConfig.headers) return;

    const routes = await nextConfig.headers();
    const headerMap = new Map(routes[0].headers.map((h) => [h.key, h.value]));

    expect(headerMap.get("Strict-Transport-Security")).toBeUndefined();

    const csp = headerMap.get("Content-Security-Policy") || headerMap.get("Content-Security-Policy-Report-Only");
    expect(csp).toContain("'unsafe-eval'");
  });
});
