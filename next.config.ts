import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const isDev = process.env.NODE_ENV !== "production";
const sentryDsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

const sentryHost = sentryDsn
  ? (() => {
      try {
        return new URL(sentryDsn).host;
      } catch {
        return null;
      }
    })()
  : null;
const sentryConnect = sentryHost ? ` https://${sentryHost}` : "";

// Production Clerk использует кастомный субдомен (clerk.<your-domain>).
// Декодируем хост из publishable key (формат: pk_(test|live)_<base64(host$)>).
const clerkPk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
const clerkFrontendHost = (() => {
  const m = clerkPk.match(/^pk_(?:test|live)_(.+)$/);
  if (!m) return null;
  try {
    const decoded = Buffer.from(m[1], "base64").toString("utf8");
    return decoded.replace(/\$+$/, "").trim() || null;
  } catch {
    return null;
  }
})();
const clerkExtra = clerkFrontendHost ? ` https://${clerkFrontendHost}` : "";

// Clerk JS грузится с *.clerk.com / *.clerk.accounts.dev (dev), но для production
// frontend-API живёт на clerk.<your-domain>. Без него Clerk Component не отрисуется.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""} https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com${clerkExtra}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  `img-src 'self' data: blob: https://img.clerk.com https://*.clerk.com${clerkExtra}`,
  "media-src 'self' blob:",
  `connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com${clerkExtra}${sentryConnect}`,
  `frame-src https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com${clerkExtra}`,
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
]
  .filter(Boolean)
  .join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(self), geolocation=(), payment=()",
  },
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]),
];

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default sentryDsn
  ? withSentryConfig(nextConfig, {
      silent: true,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      widenClientFileUpload: true,
      disableLogger: true,
    })
  : nextConfig;
