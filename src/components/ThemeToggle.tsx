"use client";

import { useSyncExternalStore } from "react";

type Theme = "dark" | "light";

const read = (): Theme => (document.documentElement.dataset.theme === "light" ? "light" : "dark");
const subscribe = (cb: () => void) => {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
};

/** Light / dark switch. The choice is remembered in this browser; with no choice the device setting is used. */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, read, () => "dark" as Theme);
  const flip = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("frontrow-theme", next);
    } catch {
      /* private mode: the choice just lasts for this visit */
    }
  };
  return (
    <button type="button" onClick={flip} className="btn-ghost !min-h-8 !px-3 text-xs" aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
