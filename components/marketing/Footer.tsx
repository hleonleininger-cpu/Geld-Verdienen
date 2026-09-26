import Link from "next/link";
import { Logo } from "@/components/Logo";

export function MarketingFooter() {
  return (
    <footer className="no-print border-t border-ink-100 bg-white">
      <div className="container-app grid gap-10 py-14 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-ink-500">
            Der einfache Weg für lokale Dienstleister, Kundenanfragen zu
            sammeln und schneller zu beantworten.
          </p>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-ink-900">Produkt</p>
          <ul className="space-y-2 text-sm text-ink-500">
            <li><Link href="/#funktionen" className="hover:text-ink-900">Funktionen</Link></li>
            <li><Link href="/pricing" className="hover:text-ink-900">Preise</Link></li>
            <li><Link href="/shop" className="hover:text-ink-900">Shop</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-ink-900">Konto</p>
          <ul className="space-y-2 text-sm text-ink-500">
            <li><Link href="/login" className="hover:text-ink-900">Login</Link></li>
            <li><Link href="/register" className="hover:text-ink-900">Registrieren</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-ink-900">Demo</p>
          <ul className="space-y-2 text-sm text-ink-500">
            <li><Link href="/glanzwerk-autopflege" className="hover:text-ink-900">Beispiel-Anfrageseite</Link></li>
          </ul>
        </div>
      </div>
      <div className="container-app border-t border-ink-100 py-6 text-xs text-ink-400">
        © {new Date().getFullYear()} AnfragePilot · Ein MVP-Projekt
      </div>
    </footer>
  );
}
