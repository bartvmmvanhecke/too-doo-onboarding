import type { Metadata } from "next";
import { Hydrated } from "@/components/hydrated";
import { OverlegScreen } from "./overleg-screen";

export const metadata: Metadata = { title: "Je eerste overleg · too-doo" };

export default function Page() {
  return (
    <Hydrated>
      <OverlegScreen />
    </Hydrated>
  );
}
