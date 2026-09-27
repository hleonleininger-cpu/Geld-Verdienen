"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Image from "next/image";
import { Upload, X } from "lucide-react";
import { addGalleryImage, removeGalleryImage, type BusinessActionState } from "@/app/dashboard/actions";

const MAX_GALLERY_IMAGES = 8;

function UploadButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-2 rounded-lg border border-ink-200 px-3.5 py-2 text-sm font-medium text-ink-700 hover:border-ink-300 disabled:opacity-60"
    >
      <Upload className="h-4 w-4" />
      {pending ? "Wird hochgeladen…" : "Bild hochladen"}
    </button>
  );
}

export function GalleryManager({ businessId, images }: { businessId: string; images: string[] }) {
  const initialState: BusinessActionState = null;
  const [state, formAction] = useActionState(addGalleryImage, initialState);

  // Erzwingt einen Remount des <input type="file">, sobald ein Upload
  // erfolgreich war – ein natives File-Input laesst sich nicht per Prop
  // zuruecksetzen. "Adjusting state during rendering" statt Effect.
  const [formKey, setFormKey] = useState(0);
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state?.message) setFormKey((k) => k + 1);
  }

  return (
    <div className="space-y-3">
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((url) => (
            <div
              key={url}
              className="relative aspect-square overflow-hidden rounded-lg border border-ink-100 bg-ink-50"
            >
              <Image src={url} alt="" fill sizes="200px" className="object-cover" />
              <form
                action={removeGalleryImage.bind(null, businessId, url)}
                className="absolute right-1 top-1"
              >
                <button
                  type="submit"
                  aria-label="Bild entfernen"
                  className="rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                >
                  <X className="h-3 w-3" />
                </button>
              </form>
            </div>
          ))}
        </div>
      )}

      {images.length < MAX_GALLERY_IMAGES ? (
        <form key={formKey} action={formAction} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="business_id" value={businessId} />
          <input
            type="file"
            name="image"
            accept="image/png,image/jpeg,image/webp"
            required
            className="text-sm text-ink-600"
          />
          <UploadButton />
        </form>
      ) : (
        <p className="text-xs text-ink-400">Maximal {MAX_GALLERY_IMAGES} Bilder erreicht.</p>
      )}
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </div>
  );
}
