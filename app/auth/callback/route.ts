import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const failureUrl = new URL("/login", origin);
      failureUrl.searchParams.set(
        "error",
        "Der Bestätigungslink ist ungültig oder abgelaufen. Bitte fordere einen neuen an."
      );
      return NextResponse.redirect(failureUrl);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
