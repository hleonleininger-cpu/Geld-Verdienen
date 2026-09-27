"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Kanban, FileText, User } from "lucide-react";
import { cn } from "@/lib/cn";

export function MobileTabBar() {
  const pathname = usePathname();

  const links = [
    { href: "/dashboard", label: "Übersicht", icon: LayoutGrid, exact: true },
    { href: "/dashboard/leads", label: "Anfragen", icon: Kanban, exact: false },
    { href: "/dashboard/quotes", label: "Angebote", icon: FileText, exact: false },
    { href: "/dashboard/profile", label: "Profil", icon: User, exact: false },
  ];

  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-30 flex border-t border-ink-100 bg-white/95 backdrop-blur-sm md:hidden">
      {links.map((link) => {
        const isActive = link.exact ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
              isActive ? "text-ink-950" : "text-ink-400"
            )}
          >
            <link.icon className="h-5 w-5" strokeWidth={1.75} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
