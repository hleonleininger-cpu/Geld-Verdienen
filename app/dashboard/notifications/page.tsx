import type { Metadata } from "next";
import Link from "next/link";
import { Bell, Check, Eye, FileText, ThumbsDown, ThumbsUp, UserPlus } from "lucide-react";
import { getCurrentBusiness } from "@/lib/data/business";
import { getNotifications } from "@/lib/data/notifications";
import { formatRelativeDe } from "@/lib/format";
import { markAllNotificationsRead, markNotificationRead } from "./actions";
import type { NotificationRow } from "@/types/database";

export const metadata: Metadata = { title: "Benachrichtigungen" };

const TYPE_ICONS: Record<string, typeof Bell> = {
  lead_created: UserPlus,
  quote_viewed: Eye,
  quote_accepted: ThumbsUp,
  quote_declined: ThumbsDown,
};

function NotificationIcon({ type }: { type: string }) {
  const Icon = TYPE_ICONS[type] ?? FileText;
  return <Icon className="h-4 w-4" />;
}

function NotificationItem({ notification }: { notification: NotificationRow }) {
  const isUnread = !notification.read_at;
  const content = (
    <div
      className={`flex items-start gap-3 rounded-xl border p-4 transition-colors ${
        isUnread ? "border-brand-200 bg-brand-50" : "border-ink-100 bg-white"
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUnread ? "bg-brand-600 text-white" : "bg-sand-100 text-ink-500"
        }`}
      >
        <NotificationIcon type={notification.type} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink-900">{notification.title}</p>
        {notification.body && <p className="mt-0.5 text-sm text-ink-600">{notification.body}</p>}
        <p className="mt-1 text-xs text-ink-400">{formatRelativeDe(notification.created_at)}</p>
      </div>
      {isUnread && (
        <form action={markNotificationRead.bind(null, notification.id)}>
          <button
            type="submit"
            aria-label="Als gelesen markieren"
            className="rounded-lg p-1.5 text-ink-400 hover:bg-white hover:text-brand-700"
          >
            <Check className="h-4 w-4" />
          </button>
        </form>
      )}
    </div>
  );

  if (!notification.link) return content;
  return (
    <Link href={notification.link} className="block">
      {content}
    </Link>
  );
}

export default async function NotificationsPage() {
  const business = await getCurrentBusiness();
  if (!business) return null;

  const notifications = await getNotifications(business.id, 50);
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-950">Benachrichtigungen</h1>
          <p className="mt-1 text-sm text-ink-500">
            Neue Anfragen und Kundenaktionen zu deinen Angeboten.
          </p>
        </div>
        {unreadCount > 0 && (
          <form action={markAllNotificationsRead}>
            <button
              type="submit"
              className="rounded-lg border border-ink-200 px-3.5 py-2 text-sm font-medium text-ink-700 hover:border-ink-300"
            >
              Alle als gelesen markieren
            </button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="card-surface flex flex-col items-center gap-3 p-10 text-center">
          <Bell className="h-8 w-8 text-ink-300" />
          <p className="text-sm text-ink-500">Noch keine Benachrichtigungen.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {notifications.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} />
          ))}
        </div>
      )}
    </div>
  );
}
