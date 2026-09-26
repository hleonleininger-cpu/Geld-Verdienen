import Link from "next/link";
import { Label, Input, FieldHint } from "@/components/ui/Field";
import { AuthForm } from "@/components/auth/AuthForm";
import { signUp } from "@/app/(auth)/actions";

export default function RegisterPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink-950">
        Konto erstellen
      </h1>
      <p className="mt-1.5 text-sm text-ink-500">
        Starte kostenlos – keine Kreditkarte nötig.
      </p>

      <div className="mt-7">
        <AuthForm action={signUp} submitLabel="Kostenlos registrieren">
          <div>
            <Label htmlFor="email">E-Mail</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div>
            <Label htmlFor="password">Passwort</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
            <FieldHint>Mindestens 8 Zeichen.</FieldHint>
          </div>
        </AuthForm>
      </div>

      <p className="mt-6 text-center text-sm text-ink-500">
        Bereits registriert?{" "}
        <Link href="/login" className="font-medium text-ink-950 hover:underline">
          Zum Login
        </Link>
      </p>
    </div>
  );
}
