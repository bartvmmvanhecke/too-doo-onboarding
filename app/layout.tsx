import { Suspense } from "react";
import type { Metadata } from "next";
import { DM_Sans, Nunito, Rubik } from "next/font/google";
import { DemoBar } from "@/components/demo/demo-bar";
import { PrototypeNav } from "@/components/prototype/prototype-nav";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

/** Tekstfont van de product-app (vergaderingen). */
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

/** Tekstfont van de nieuwe website (homepage vanaf sectie 2). */
const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "too-doo · onboarding-prototype",
  description: "Klikbaar prototype van de nieuwe onboarding van too-doo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl-BE" className={`${nunito.variable} ${rubik.variable} ${dmSans.variable} h-full`}>
      <body className="min-h-full">
        {children}
        <Suspense fallback={null}>
          <PrototypeNav />
        </Suspense>
        <DemoBar />
        <Toaster />
      </body>
    </html>
  );
}
