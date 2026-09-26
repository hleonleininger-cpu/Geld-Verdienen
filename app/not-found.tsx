import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-sand-50 px-5 text-center">
      <Link href="/">
        <Logo />
      </Link>
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink-950">
          Seite nicht gefunden
        </h1>
        <p className="mt-2 text-sm text-ink-500">
          Die gesuchte Seite existiert nicht oder wurde verschoben.
        </p>
      </div>
      <ButtonLink href="/">Zur Startseite</ButtonLink>
    </div>
  );
}
