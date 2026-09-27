import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  title: "Willkommen",
  robots: { index: false, follow: false },
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-sand-50">
      <header className="container-app flex h-16 items-center">
        <Link href="/">
          <Logo />
        </Link>
      </header>
      <main className="container-app pb-16 pt-4">
        <div className="mx-auto max-w-xl">{children}</div>
      </main>
    </div>
  );
}
