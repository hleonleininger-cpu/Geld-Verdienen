import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";

const links = [
  { href: "/#funktionen", label: "Funktionen" },
  { href: "/pricing", label: "Preise" },
  { href: "/shop", label: "Shop" },
  { href: "/#faq", label: "FAQ" },
];

export async function MarketingNavbar() {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  const isLoggedIn = Boolean(data.user);

  return (
    <header className="no-print sticky top-0 z-40 border-b border-ink-100/70 bg-sand-50/90 backdrop-blur-sm">
      <div className="container-app flex h-16 items-center justify-between">
        <Link href="/" aria-label="AnfragePilot Startseite">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium text-ink-600 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-ink-950"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2.5">
          {isLoggedIn ? (
            <ButtonLink href="/dashboard" size="sm">
              Zum Dashboard
            </ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
                Login
              </ButtonLink>
              <ButtonLink href="/register" size="sm">
                Kostenlos testen
              </ButtonLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
