import Link from "next/link";
import { Label, Input } from "@/components/ui/Field";
import { AuthForm } from "@/components/auth/AuthForm";
import { signIn } from "@/app/(auth)/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; error?: string }>;
}) {
  const { redirectTo, error } = await searchParams;

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink-950">
        Willkommen zurück
      </h1>
      <p className="mt-1.5 text-sm text-ink-500">
        Melde dich an, um deine Anfragen zu verwalten.
      </p>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-7">
        <AuthForm
          action={signIn}
          submitLabel="Anmelden"
          hiddenFields={{ redirectTo: redirectTo ?? "/dashboard" }}
        >
          <div>
            <Label htmlFor="email">E-Mail</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <Label htmlFor="password">Passwort</Label>
              <Link href="/reset-password" className="text-xs font-medium text-brand-700 hover:underline">
                Passwort vergessen?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>
        </AuthForm>
      </div>

      <p className="mt-6 text-center text-sm text-ink-500">
        Noch kein Konto?{" "}
        <Link href="/register" className="font-medium text-ink-950 hover:underline">
          Jetzt registrieren
        </Link>
      </p>
    </div>
  );
}
