import type { Metadata } from "next";
import { Hydrated } from "@/components/hydrated";
import { VergaderingenScreen } from "./vergaderingen-screen";

export const metadata: Metadata = { title: "Vergaderingen · too-doo" };

export default function Page() {
  return (
    <Hydrated>
      <VergaderingenScreen />
    </Hydrated>
  );
}
