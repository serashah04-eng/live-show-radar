import type { Metadata } from "next";
import { Anton, Space_Grotesk } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { EarlyBirdAlert } from "@/components/EarlyBirdAlert";
import { Motion } from "@/components/Motion";
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
    <html lang="en" className={`${display.variable} ${body.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem("frontrow-theme");if(!t&&window.matchMedia("(prefers-color-scheme: light)").matches)t="light";if(t)document.documentElement.dataset.theme=t}catch(e){}` }} />
      </head>
      <body className="min-h-full flex flex-col">
        <div className="intro" aria-hidden="true">
          <div className="text-center">
            <p className="intro-word">{APP_NAME}</p>
            <p className="intro-count mt-6 inline-block" />
          </div>
        </div>
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-orange focus:px-3 focus:py-2 focus:text-ink">
          Skip to content
        </a>
        <Suspense fallback={<header className="h-16 border-b border-line" />}>
          <Nav />
        </Suspense>
        <main id="main" className="wrap flex-1 py-8">
          {children}
        </main>
        <Suspense fallback={null}>
          <Motion />
        </Suspense>
        <Suspense fallback={null}>
          <EarlyBirdAlert />
        </Suspense>
        <footer className="mt-10 border-t border-line">
          <div className="wrap py-8">
            <div className="mb-10 grid gap-8 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="mono mb-3">Explore</p>
                <ul className="space-y-2"><li><Link href="/feed" className="hover:text-lime">Concert feed</Link></li><li><Link href="/artists" className="hover:text-lime">Artists</Link></li><li><Link href="/start" className="hover:text-lime">Pick your scene</Link></li></ul>
              </div>
              <div>
                <p className="mono mb-3">Your account</p>
                <ul className="space-y-2"><li><Link href="/settings" className="hover:text-lime">Settings and alerts</Link></li><li><Link href="/submit" className="hover:text-lime">Add an event</Link></li></ul>
              </div>
              <div>
                <p className="mono mb-3">How it works</p>
                <ul className="space-y-2 muted"><li>Search finds shows</li><li>2+ sites corroborate</li><li>You verify with evidence</li></ul>
              </div>
              <div>
                <p className="mono mb-3">Good to know</p>
                <ul className="space-y-2 muted"><li>We never sell tickets</li><li>Bengaluru first, all India</li><li>Verified means evidence</li></ul>
              </div>
            </div>
            <p className="bigfoot" aria-hidden="true">{APP_NAME}</p>
            <p className="mt-4 text-xs muted">
              {APP_NAME} informs; you decide what to attend and buy. Unverified listings are labelled and may be wrong.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
