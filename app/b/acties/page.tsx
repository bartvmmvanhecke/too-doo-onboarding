import type { Metadata } from "next";
import { Hydrated } from "@/components/hydrated";
import { NotesScreen } from "./notes-screen";

export const metadata: Metadata = { title: "Acties uit je notities · too-doo" };

export default function Page() {
  return (
    <Hydrated>
      <NotesScreen />
    </Hydrated>
  );
}
