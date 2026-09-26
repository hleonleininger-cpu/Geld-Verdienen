import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

/**
 * Server-side Supabase client for use in Server Components, Server Actions
 * and Route Handlers. Reads/writes the auth session via Next.js cookies.
 *
 * `cookies()` is async since Next.js 15/16 (Async Request APIs), so this
 * factory is async too – every call site must `await createClient()`.
 *
 * Uses the batched `getAll`/`setAll` cookie API, which is the pattern
 * Supabase currently recommends for `@supabase/ssr` (the older per-cookie
 * `get`/`set`/`remove` methods are deprecated).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component without a mutable request –
            // the middleware refreshes the session instead, so this is safe to ignore.
          }
        },
      },
    }
  );
}
