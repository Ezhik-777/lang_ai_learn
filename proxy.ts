import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtected = createRouteMatcher([
  "/dashboard(.*)",
  "/onboarding(.*)",
  "/test(.*)",
  "/practice(.*)",
  "/api/test/(.*)",
  "/api/sentence/(.*)",
  "/api/pronunciation/(.*)",
  "/api/listening/(.*)",
  "/api/tts/(.*)",
]);

const isCron = createRouteMatcher(["/api/cron/(.*)"]);

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export default clerkMiddleware(async (auth, req) => {
  // Cron endpoints — собственная защита CRON_SECRET, без Clerk и без CSRF.
  if (isCron(req)) return;

  // CSRF / cross-site guard для unsafe-методов на остальных API.
  if (UNSAFE_METHODS.has(req.method)) {
    const url = new URL(req.url);
    const origin = req.headers.get("origin");
    const secFetchSite = req.headers.get("sec-fetch-site");

    if (secFetchSite && secFetchSite !== "same-origin" && secFetchSite !== "none") {
      return NextResponse.json(
        { error: "Cross-site request blocked" },
        { status: 403 },
      );
    }
    if (origin) {
      try {
        if (new URL(origin).host !== url.host) {
          return NextResponse.json(
            { error: "Origin mismatch" },
            { status: 403 },
          );
        }
      } catch {
        return NextResponse.json({ error: "Bad Origin" }, { status: 403 });
      }
    }
  }

  if (isProtected(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
