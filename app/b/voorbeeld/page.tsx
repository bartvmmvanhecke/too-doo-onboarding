import type { Metadata } from "next";
import { Hydrated } from "@/components/hydrated";
import { ExampleB } from "./example-b";

export const metadata: Metadata = { title: "Herken je dit? · too-doo" };

export default function Page() {
  return (
    <Hydrated fallback={<div className="min-h-dvh bg-app" />}>
      <ExampleB />
    </Hydrated>
  );
}
