import { Label, Input, FieldHint } from "@/components/ui/Field";
import { AuthForm } from "@/components/auth/AuthForm";
import { updatePassword } from "@/app/(auth)/actions";

export default function ResetPasswordConfirmPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink-950">
        Neues Passwort setzen
      </h1>
      <p className="mt-1.5 text-sm text-ink-500">
        Wähle ein neues Passwort für dein Konto.
      </p>

      <div className="mt-7">
        <AuthForm action={updatePassword} submitLabel="Passwort speichern">
          <div>
            <Label htmlFor="password">Neues Passwort</Label>
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
    </div>
  );
}
