import type { Metadata } from "next";
import { Anton, Space_Grotesk } from "next/font/google";
import { Suspense } from "react";
import { EarlyBirdAlert } from "@/components/EarlyBirdAlert";
import { Nav } from "@/components/Nav";
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from "@/lib/brand";
import "./globals.css";

const display = Anton({ variable: "--font-display", subsets: ["latin"], weight: "400" });
const body = Space_Grotesk({ variable: "--font-body", subsets: ["latin"] });

export const metadata: Metadata = {
  title: `${APP_NAME}: ${APP_TAGLINE}`,
  description: APP_DESCRIPTION,
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
          {APP_NAME} informs; you decide what to attend and buy. Unverified listings are labelled and may be wrong.
        </footer>
      </body>
    </html>
  );
}
