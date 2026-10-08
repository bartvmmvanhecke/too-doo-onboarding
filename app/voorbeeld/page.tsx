import type { Metadata } from "next";
import { ExampleScreen } from "./example-screen";

export const metadata: Metadata = { title: "Rondkijken met voorbeelddata · too-doo" };

export default function Page() {
  return <ExampleScreen />;
}
