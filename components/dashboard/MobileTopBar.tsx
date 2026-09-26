import { LogOut } from "lucide-react";
import { Logo } from "@/components/Logo";
import { signOut } from "@/app/(auth)/actions";

export function MobileTopBar() {
  return (
    <div className="no-print flex h-14 items-center justify-between border-b border-ink-100 bg-white px-4 md:hidden">
      <Logo className="text-base" />
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
  );
}
