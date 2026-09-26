import Link from "next/link";
import { Label, Input } from "@/components/ui/Field";
import { AuthForm } from "@/components/auth/AuthForm";
import { requestPasswordReset } from "@/app/(auth)/actions";

export default function ResetPasswordPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink-950">
        Passwort zurücksetzen
      </h1>
      <p className="mt-1.5 text-sm text-ink-500">
        Gib deine E-Mail-Adresse ein – wir senden dir einen Link zum
        Zurücksetzen.
      </p>

      <div className="mt-7">
        <AuthForm action={requestPasswordReset} submitLabel="Link senden">
          <div>
            <Label htmlFor="email">E-Mail</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
        </AuthForm>
      </div>

      <p className="mt-6 text-center text-sm text-ink-500">
        <Link href="/login" className="font-medium text-ink-950 hover:underline">
          Zurück zum Login
        </Link>
      </p>
    </div>
  );
}
