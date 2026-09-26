function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-ink-100 ${className ?? ""}`} />;
}

export default function ProfileLoading() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <SkeletonBlock className="h-7 w-32" />
        <SkeletonBlock className="mt-2 h-4 w-72" />
      </div>
      <SkeletonBlock className="h-16 w-full" />
      <div className="card-surface space-y-5 p-6 sm:p-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
