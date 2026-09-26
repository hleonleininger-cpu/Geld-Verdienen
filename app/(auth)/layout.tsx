import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";

// Login/Registrierung/Passwort-Reset sind keine Inhalte fuer Suchmaschinen.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-sand-50">
      <header className="container-app flex h-16 items-center">
        <Link href="/">
          <Logo />
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
