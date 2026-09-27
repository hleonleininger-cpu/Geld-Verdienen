"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  User,
  ExternalLink,
  LogOut,
  Kanban,
  FileText,
  Wrench,
  CreditCard,
  Bell,
  ListChecks,
  CalendarClock,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { signOut } from "@/app/(auth)/actions";
import { cn } from "@/lib/cn";

export function Sidebar({ slug, unreadCount = 0 }: { slug: string; unreadCount?: number }) {
  const pathname = usePathname();

  const links = [
    { href: "/dashboard", label: "Übersicht", icon: LayoutGrid, exact: true },
    { href: "/dashboard/leads", label: "Anfragen", icon: Kanban, exact: false },
    { href: "/dashboard/quotes", label: "Angebote", icon: FileText, exact: false },
    { href: "/dashboard/services", label: "Leistungen", icon: Wrench, exact: false },
    { href: "/dashboard/forms", label: "Formulare", icon: ListChecks, exact: false },
    { href: "/dashboard/appointments", label: "Termine", icon: CalendarClock, exact: false },
    {
      href: "/dashboard/notifications",
      label: "Benachrichtigungen",
      icon: Bell,
      exact: false,
      badge: unreadCount,
    },
    { href: "/dashboard/billing", label: "Abrechnung", icon: CreditCard, exact: false },
    { href: "/dashboard/profile", label: "Profil", icon: User, exact: false },
  ];

  return (
    <aside className="no-print flex h-full w-full flex-col border-r border-ink-100 bg-white px-4 py-6">
      <Link href="/dashboard" className="px-2">
        <Logo />
      </Link>

      <nav className="mt-8 flex-1 space-y-1">
        {links.map((link) => {
          const isActive = link.exact
            ? pathname === link.href
            : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-ink-950 text-white"
                  : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
              )}
            >
              <link.icon className="h-4 w-4" strokeWidth={1.75} />
              {link.label}
              {"badge" in link && link.badge ? (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-semibold text-white">
                  {link.badge > 9 ? "9+" : link.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-ink-100 pt-4">
        <a
          href={`/${slug}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-600 hover:bg-ink-50 hover:text-ink-900"
        >
          <ExternalLink className="h-4 w-4" strokeWidth={1.75} />
          Anfrageseite ansehen
        </a>
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-600 hover:bg-ink-50 hover:text-ink-900"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
            Abmelden
          </button>
        </form>
      </div>
    </aside>
  );
}
