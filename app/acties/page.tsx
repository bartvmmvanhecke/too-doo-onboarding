import type { Metadata } from "next";
import { Hydrated } from "@/components/hydrated";
import { Step3Screen } from "./step3-screen";

export const metadata: Metadata = { title: "Openstaande acties · too-doo" };

export default function Page() {
  return (
    <Hydrated>
      <Step3Screen />
    </Hydrated>
  );
}
