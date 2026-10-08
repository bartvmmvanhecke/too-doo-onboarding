import type { Metadata } from "next";
import { AccountScreen } from "./account-screen";

export const metadata: Metadata = { title: "Maak je account aan · too-doo" };

export default function Page() {
  return <AccountScreen />;
}
