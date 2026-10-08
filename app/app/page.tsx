import type { Metadata } from "next";
import { Hydrated } from "@/components/hydrated";
import { EmptyScreen } from "./empty-screen";

export const metadata: Metadata = { title: "Vergaderingen · too-doo" };

export default function Page() {
  return (
    <Hydrated>
      <EmptyScreen />
    </Hydrated>
  );
}
