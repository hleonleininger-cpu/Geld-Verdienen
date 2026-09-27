export interface FunnelStage {
  label: string;
  value: number;
}

/**
 * Einfacher horizontaler Funnel (Section 12: "Keep charts simple and
 * useful") – bewusst ohne Chart-Bibliothek, nur proportionale Balken.
 * Jede Stufe wird relativ zur ersten (groessten) Stufe skaliert.
 */
export function FunnelWidget({ stages }: { stages: FunnelStage[] }) {
  const max = Math.max(1, ...stages.map((s) => s.value));

  return (
    <div className="card-surface p-5">
      <p className="mb-4 text-sm font-medium text-ink-900">Funnel</p>
      <div className="space-y-3">
        {stages.map((stage) => (
          <div key={stage.label}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-ink-600">{stage.label}</span>
              <span className="font-semibold text-ink-950">{stage.value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-sand-100">
              <div
                className="h-full rounded-full bg-brand-600"
                style={{ width: `${Math.max(4, (stage.value / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
