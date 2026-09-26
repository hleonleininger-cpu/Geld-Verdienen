const rows = [
  { name: "Max Mustermann", service: "Autopflege", status: "Neu", color: "bg-brand-100 text-brand-700" },
  { name: "Julia Weber", service: "Lackversiegelung", status: "In Bearbeitung", color: "bg-amber-100 text-amber-700" },
  { name: "Familie Schneider", service: "Umzugsreinigung", status: "Angebot gesendet", color: "bg-sky-100 text-sky-700" },
  { name: "Sarah & Tom", service: "Hochzeitsfotografie", status: "Gewonnen", color: "bg-brand-600 text-white" },
];

export function DashboardPreview() {
  return (
    <div className="relative rounded-2xl border border-ink-100 bg-white p-5 shadow-card sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
            Dashboard
          </p>
          <p className="font-display text-lg font-semibold text-ink-950">
            Glanzwerk Autopflege
          </p>
        </div>
        <div className="h-9 w-9 rounded-full bg-ink-950 text-center text-sm font-semibold leading-9 text-brand-300">
          GA
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Neue Anfragen", value: "3" },
          { label: "Offen", value: "5" },
          { label: "Antworten ausstehend", value: "2" },
          { label: "Ø Anfragewert", value: "180 €" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-ink-100 bg-sand-50 p-3">
            <p className="text-[11px] leading-tight text-ink-500">{stat.label}</p>
            <p className="mt-1 font-display text-xl font-semibold text-ink-950">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-2">
        {rows.map((row) => (
          <div
            key={row.name}
            className="flex items-center justify-between rounded-xl border border-ink-100 px-3.5 py-3"
          >
            <div>
              <p className="text-sm font-medium text-ink-900">{row.name}</p>
              <p className="text-xs text-ink-400">{row.service}</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${row.color}`}>
              {row.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
