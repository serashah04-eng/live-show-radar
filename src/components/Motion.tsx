"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

gsap.registerPlugin(ScrollTrigger);

/**
 * Scroll and entrance motion driven by data attributes in the markup (nothing here changes content):
 *  data-gsap="mosaic"   children pop in with a randomised stagger (hero tiles)
 *  data-gsap="parallax" the first child drifts as you scroll (photo tiles)
 *  data-gsap="words"    each word lights up as you scroll through the statement
 *  data-gsap="rise"     the element slides up when it enters the viewport
 *  data-gsap="stagger"  children slide up one after another
 *  data-gsap="marquee"  the track loops and speeds up with scroll velocity
 * Skipped entirely for people who prefer reduced motion. Streamed content is picked up as it arrives.
 */
export function Motion() {
  const pathname = usePathname();

  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const done = (el: Element) => {
        if (el.getAttribute("data-gsap-init")) return false;
        el.setAttribute("data-gsap-init", "1");
        return true;
      };

      const setup = () => {
        document.querySelectorAll<HTMLElement>('[data-gsap="mosaic"]').forEach((el) => {
          if (!done(el)) return;
          gsap.from(el.children, { opacity: 0, scale: 0.92, duration: 0.7, ease: "power3.out", stagger: { each: 0.09, from: "random" }, clearProps: "all" });
        });

        document.querySelectorAll<HTMLElement>('[data-gsap="parallax"]').forEach((el) => {
          if (!done(el) || !el.firstElementChild) return;
          gsap.fromTo(el.firstElementChild, { yPercent: -10, scale: 1.18 }, {
            yPercent: 10, ease: "none",
            scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
          });
        });

        document.querySelectorAll<HTMLElement>('[data-gsap="words"]').forEach((el) => {
          if (!done(el)) return;
          const words = el.querySelectorAll(".w");
          gsap.fromTo(words, { opacity: 0.14 }, {
            opacity: 1, ease: "none", stagger: 0.12,
            scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 45%", scrub: true },
          });
        });

        document.querySelectorAll<HTMLElement>('[data-gsap="rise"]').forEach((el) => {
          if (!done(el)) return;
          gsap.from(el, {
            y: 44, opacity: 0, duration: 0.8, ease: "power3.out", clearProps: "all",
            scrollTrigger: { trigger: el, start: "top 90%", once: true },
          });
        });

        document.querySelectorAll<HTMLElement>('[data-gsap="stagger"]').forEach((el) => {
          if (!done(el)) return;
          gsap.from(el.children, {
            y: 36, opacity: 0, duration: 0.7, ease: "power3.out", stagger: 0.09, clearProps: "all",
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          });
        });

        document.querySelectorAll<HTMLElement>('[data-gsap="marquee"]').forEach((el) => {
          if (!done(el)) return;
          const track = el.firstElementChild as HTMLElement | null;
          if (!track) return;
          track.style.animation = "none";
          const loop = gsap.to(track, { xPercent: -50, duration: 42, ease: "none", repeat: -1 });
          ScrollTrigger.create({
            onUpdate: (self) => {
              const boost = Math.min(Math.abs(self.getVelocity()) / 250, 6);
              gsap.to(loop, { timeScale: 1 + boost, duration: 0.25, overwrite: true });
              gsap.to(loop, { timeScale: 1, duration: 0.8, delay: 0.25, overwrite: false });
            },
          });
        });
        ScrollTrigger.refresh();
      };

      setup();
      // content streamed in after hydration (Suspense) is wired up as it appears
      let timer: ReturnType<typeof setTimeout> | undefined;
      const main = document.getElementById("main");
      const observer = new MutationObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(setup, 120);
      });
      if (main) observer.observe(main, { childList: true, subtree: true });

      return () => {
        clearTimeout(timer);
        observer.disconnect();
        document.querySelectorAll("[data-gsap-init]").forEach((el) => el.removeAttribute("data-gsap-init"));
      };
    });
    return () => mm.revert();
  }, [pathname]);

  return null;
}
