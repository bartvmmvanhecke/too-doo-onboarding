import { Suspense } from "react";
import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { DemoBar } from "@/components/demo/demo-bar";
import { PrototypeNav } from "@/components/prototype/prototype-nav";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "too-doo · onboarding-prototype",
  description: "Klikbaar prototype van de nieuwe onboarding van too-doo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl-BE" className={`${nunito.variable} h-full`}>
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
