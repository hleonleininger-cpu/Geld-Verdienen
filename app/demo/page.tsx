import type { Metadata } from "next";
import { DemoExperience } from "@/components/demo/DemoExperience";

export const metadata: Metadata = {
  title: "Demo",
  description:
    "Sieh dir AnfragePilot anhand von Shine Garage an – vom Anfrageformular bis zum gewonnenen Auftrag, mit Beispieldaten.",
};

export default function DemoPage() {
  return <DemoExperience />;
}
