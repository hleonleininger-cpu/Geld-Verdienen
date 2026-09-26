function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-ink-100 ${className ?? ""}`} />;
}

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <div>
        <SkeletonBlock className="h-7 w-40" />
        <SkeletonBlock className="mt-2 h-4 w-56" />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card-surface space-y-3 p-5">
            <SkeletonBlock className="h-4 w-20" />
            <SkeletonBlock className="h-7 w-14" />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card-surface flex items-center justify-between p-5">
            <div className="space-y-2">
              <SkeletonBlock className="h-4 w-32" />
              <SkeletonBlock className="h-3 w-24" />
            </div>
            <SkeletonBlock className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
