"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, User, ExternalLink } from "lucide-react";
import { cn } from "@/lib/cn";

export function MobileTabBar({ slug }: { slug: string }) {
  const pathname = usePathname();

  const links = [
    { href: "/dashboard", label: "Übersicht", icon: LayoutGrid, exact: true },
    { href: "/dashboard/profile", label: "Profil", icon: User, exact: false },
    { href: `/${slug}`, label: "Anfrageseite", icon: ExternalLink, exact: false, external: true },
  ];

  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-30 flex border-t border-ink-100 bg-white/95 backdrop-blur-sm md:hidden">
      {links.map((link) => {
        const isActive = !link.external && (link.exact ? pathname === link.href : pathname.startsWith(link.href));
        return (
          <Link
            key={link.href}
            href={link.href}
            target={link.external ? "_blank" : undefined}
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
