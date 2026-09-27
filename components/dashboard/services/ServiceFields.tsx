import { Label, Input, Textarea } from "@/components/ui/Field";
import type { ServiceRow } from "@/types/database";

export function ServiceFields({ defaults }: { defaults?: Partial<ServiceRow> }) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required defaultValue={defaults?.name ?? ""} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="category" optional>
            Kategorie
          </Label>
          <Input id="category" name="category" defaultValue={defaults?.category ?? ""} />
        </div>
        <div>
          <Label htmlFor="price" optional>
            Preis (€)
          </Label>
          <Input
            id="price"
            name="price"
            type="number"
            min="0"
            step="0.01"
            defaultValue={defaults?.price ?? ""}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="duration_minutes" optional>
            Dauer (Minuten)
          </Label>
          <Input
            id="duration_minutes"
            name="duration_minutes"
            type="number"
            min="1"
            defaultValue={defaults?.duration_minutes ?? ""}
          />
        </div>
        <div className="flex items-end pb-2.5">
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              name="active_on"
              value="true"
              defaultChecked={defaults?.active ?? true}
            />
            Aktiv (sichtbar auf Anfrageseite)
          </label>
        </div>
      </div>
      <div>
        <Label htmlFor="description" optional>
          Beschreibung
        </Label>
        <Textarea id="description" name="description" rows={2} defaultValue={defaults?.description ?? ""} />
      </div>
    </div>
  );
}
