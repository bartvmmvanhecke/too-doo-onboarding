import type { Metadata } from "next";
import { Hydrated } from "@/components/hydrated";
import { BlockedScreen } from "./blocked-screen";

export const metadata: Metadata = { title: "Ga verder met je werk-e-mail · too-doo" };

export default function Page() {
  return (
    <Hydrated>
      <BlockedScreen />
    </Hydrated>
  );
}
