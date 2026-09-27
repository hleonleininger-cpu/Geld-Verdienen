import Link from "next/link";
import { Bell, LogOut } from "lucide-react";
import { Logo } from "@/components/Logo";
import { signOut } from "@/app/(auth)/actions";

export function MobileTopBar({ unreadCount = 0 }: { unreadCount?: number }) {
  return (
    <div className="no-print flex h-14 items-center justify-between border-b border-ink-100 bg-white px-4 md:hidden">
      <Logo className="text-base" />
      <div className="flex items-center gap-1">
        <Link
          href="/dashboard/notifications"
          aria-label="Benachrichtigungen"
          className="relative rounded-lg p-2 text-ink-500 hover:bg-ink-50 hover:text-ink-900"
        >
          <Bell className="h-4 w-4" strokeWidth={1.75} />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[9px] font-semibold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            aria-label="Abmelden"
            className="rounded-lg p-2 text-ink-500 hover:bg-ink-50 hover:text-ink-900"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </form>
      </div>
    </div>
  );
}
