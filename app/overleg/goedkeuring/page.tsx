import type { Metadata } from "next";
import { Hydrated } from "@/components/hydrated";
import { ApprovalScreen } from "./approval-screen";

export const metadata: Metadata = { title: "Goedkeuring IT-beheerder · too-doo" };

export default function Page() {
  return (
    <Hydrated>
      <ApprovalScreen />
    </Hydrated>
  );
}
