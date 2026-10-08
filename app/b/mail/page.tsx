import type { Metadata } from "next";
import { Hydrated } from "@/components/hydrated";
import { MailScreen } from "./mail-screen";

export const metadata: Metadata = { title: "Voorbeeldmail aan een eigenaar · too-doo" };

export default function Page() {
  return (
    <div className="flex min-h-dvh flex-col items-center bg-[#E9EDF3] px-4 py-12 text-ink">
      <main className="w-full">
        <h1 className="sr-only">Wat een eigenaar per mail ontvangt</h1>
        <Hydrated>
          <MailScreen />
        </Hydrated>
      </main>
    </div>
  );
}
