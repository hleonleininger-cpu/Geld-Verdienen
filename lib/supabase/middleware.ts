import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data } = await supabase.auth.getUser();
  const user = data.user;

  const path = request.nextUrl.pathname;
  const isProtected =
    path.startsWith("/dashboard") || path.startsWith("/admin") || path.startsWith("/onboarding");
  const isAuthPage =
    path.startsWith("/login") ||
    path.startsWith("/register") ||
    path.startsWith("/reset-password");

  if (isProtected && !user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectTo", path);
    return NextResponse.redirect(redirectUrl);
  }

  if (isAuthPage && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Referral-Tracking (Phase 15): ein `?ref=CODE`-Parameter wird einmalig
  // in einem Cookie gemerkt (30 Tage) und als "clicked"-Event protokolliert.
  // Die eigentliche Verknuepfung mit einem neuen Business passiert erst
  // beim Onboarding (siehe app/onboarding/actions.ts), das dieses Cookie
  // ausliest.
  const refParam = request.nextUrl.searchParams.get("ref");
  if (refParam && !request.cookies.get("ap_ref")) {
    const code = refParam.trim().toLowerCase().slice(0, 32);
    if (/^[a-z0-9]+$/.test(code)) {
      response.cookies.set("ap_ref", code, {
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
        sameSite: "lax",
      });
      await supabase
        .from("referral_events")
        .insert({ referral_code: code, event_type: "clicked" });
    }
  }

  return response;
}
