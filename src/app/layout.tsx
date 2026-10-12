import type { Metadata } from "next";
import { Anton, Space_Grotesk } from "next/font/google";
import { Suspense } from "react";
import { EarlyBirdAlert } from "@/components/EarlyBirdAlert";
import { Nav } from "@/components/Nav";
import "./globals.css";

const display = Anton({ variable: "--font-display", subsets: ["latin"], weight: "400" });
const body = Space_Grotesk({ variable: "--font-body", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Live Show Radar",
  description: "Indie-first concert discovery and ticket alerts for India. Know before the early-bird window closes.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-orange focus:px-3 focus:py-2 focus:text-charcoal">
          Skip to content
        </a>
        <Suspense fallback={<header className="h-16 border-b border-line" />}>
          <Nav />
        </Suspense>
        <main id="main" className="wrap flex-1 py-8">
          {children}
        </main>
        <Suspense fallback={null}>
          <EarlyBirdAlert />
        </Suspense>
        <footer className="wrap border-t border-line py-6 text-xs muted">
          Live Show Radar informs; you decide what to attend and buy. Unverified listings are labelled and may be wrong.
        </footer>
      </body>
    </html>
  );
}
