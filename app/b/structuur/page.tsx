import type { Metadata } from "next";
import { Hydrated } from "@/components/hydrated";
import { StructureScreen } from "./structure-screen";

export const metadata: Metadata = { title: "Je overlegstructuur · too-doo" };

export default function Page() {
  return (
    <Hydrated>
      <StructureScreen />
    </Hydrated>
  );
}
