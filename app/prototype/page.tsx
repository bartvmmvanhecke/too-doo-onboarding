import type { Metadata } from "next";
import { PrototypeScreen } from "./prototype-screen";

export const metadata: Metadata = { title: "Flowkeuze · too-doo prototype" };

export default function Page() {
  return <PrototypeScreen />;
}
