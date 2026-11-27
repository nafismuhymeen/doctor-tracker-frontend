import type { NextConfig } from "next";

const BACKEND_INTERNAL_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:5000";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${BACKEND_INTERNAL_URL}/api/v1/:path*`,
      },
    ];
  },
  async headers() {
    const isProd = process.env.NODE_ENV === "production";
    const isDev = !isProd;

    // CSP Trade-off and Architecture Note (Next.js 16 App Router):
    // Next.js 16 nonce-based CSP requires per-request dynamic generation in Proxy/middleware
    // ('proxy.ts' or 'middleware.ts') with 'x-nonce' injection and forces dynamic server rendering
    // (e.g. await connection()). This disables static route optimization, ISR, and Partial Prerendering
    // (partialPrefetching: true, used in this project).
    // Following Next.js 16 recommendations for statically optimized and hybrid applications,
    // we set Content-Security-Policy in headers() using 'unsafe-inline' for scripts and styles to
    // permit Next.js framework hydration, inline chunks, and style tags while strictly restricting
    // origins, connections, fonts, and object execution.
    const cspDirectives = [
      "default-src 'self'",
      "img-src 'self' data: blob:",
      "style-src 'self' 'unsafe-inline'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
      "connect-src 'self'",
      "font-src 'self' data:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");

    const headersList: { key: string; value: string }[] = [
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      {
        key: "X-Frame-Options",
        value: "DENY",
      },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=()",
      },
      {
        key: "Content-Security-Policy",
        value: cspDirectives,
      },
    ];

    if (isProd) {
      headersList.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains",
      });
    }

    return [
      {
        source: "/:path*",
        headers: headersList,
      },
    ];
  },
};

export default nextConfig;
