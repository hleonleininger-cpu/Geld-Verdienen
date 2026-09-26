"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { safeRedirectTarget } from "@/lib/safeRedirect";

export type AuthActionState = { error?: string; message?: string } | null;

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function signIn(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = safeRedirectTarget(String(formData.get("redirectTo") ?? "/dashboard"));

  if (!email || !password) {
    return { error: "Bitte E-Mail und Passwort angeben." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    logger.warn("auth.signIn", "Login fehlgeschlagen");
    return { error: "Login fehlgeschlagen. Bitte E-Mail und Passwort prüfen." };
  }

  revalidatePath("/", "layout");
  redirect(redirectTo);
}

export async function signUp(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Bitte E-Mail und Passwort angeben." };
  }
  if (password.length < 8) {
    return { error: "Das Passwort muss mindestens 8 Zeichen lang sein." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${siteUrl()}/auth/callback?next=/dashboard` },
  });

  if (error) {
    // error.message stammt von Supabase Auth (kuratierte, nutzersichere
    // Meldungen wie "User already registered"), kein roher DB-Fehler –
    // trotzdem zusätzlich serverseitig geloggt für Observability.
    logger.warn("auth.signUp", "Registrierung fehlgeschlagen", { reason: error.message });
    return { error: "Registrierung fehlgeschlagen: " + error.message };
  }

  // Wenn Supabase E-Mail-Bestätigung deaktiviert hat, existiert bereits
  // eine Session und wir können direkt weiterleiten.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/dashboard");
  }

  return {
    message:
      "Fast fertig! Wir haben dir eine Bestätigungs-E-Mail gesendet. Klicke auf den Link, um dein Konto zu aktivieren.",
  };
}

export async function requestPasswordReset(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: "Bitte gib deine E-Mail-Adresse an." };
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/auth/callback?next=/reset-password/confirm`,
  });

  // Bewusst keine Info geben, ob die E-Mail existiert (kein Enumeration-Leak).
  return {
    message:
      "Falls ein Konto mit dieser E-Mail existiert, haben wir dir einen Link zum Zurücksetzen gesendet.",
  };
}

export async function updatePassword(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) {
    return { error: "Das Passwort muss mindestens 8 Zeichen lang sein." };
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return {
      error:
        "Dieser Link ist abgelaufen oder ungültig. Bitte fordere einen neuen Link an.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    logger.warn("auth.updatePassword", "Passwort-Update fehlgeschlagen", {
      reason: error.message,
    });
    return { error: "Passwort konnte nicht geändert werden: " + error.message };
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
