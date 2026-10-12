import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { APP_NAME } from "@/lib/brand";
import { isLocalOwnerMode } from "@/lib/local-mode";
import { MenuOverlay, type MenuLink } from "./MenuOverlay";

export async function Nav() {
  const user = await getCurrentUser();
  const admin = user ? await isAdminUser() : false;
  const local = isLocalOwnerMode();

  const links: MenuLink[] = user
    ? [
        { href: "/", label: "Dashboard", hint: "your radar" },
        { href: "/feed", label: "Concert feed", hint: "every show, filtered" },
        { href: "/artists", label: "Artists", hint: "tap to follow" },
        { href: "/start", label: "Pick your scene", hint: "genres, cities, artists" },
        { href: "/submit", label: "Add event", hint: "found a show? paste the link" },
        { href: "/settings", label: "Settings", hint: "alerts and preferences" },
        ...(admin ? [{ href: "/review", label: "Review", hint: "owner only" }, { href: "/status", label: "Status", hint: "owner only" }] : []),
      ]
    : [];

  return (
    <header className="border-b border-line">
      <div className="wrap flex items-center gap-4 py-3">
        <Link href="/" className="wordmark text-3xl sm:text-4xl" aria-label={`${APP_NAME} home`}>
          {APP_NAME}
        </Link>
        {user && local && (
          <span className="badge-warn" title="Development only. The public site always requires a login.">
            Local owner mode
          </span>
        )}
        <nav aria-label="Main" className="ml-auto hidden items-center gap-1 md:flex">
          {user && (
            <>
              <Link href="/feed" className="rounded-full px-3 py-2 text-sm muted hover:text-offwhite">Feed</Link>
              <Link href="/artists" className="rounded-full px-3 py-2 text-sm muted hover:text-offwhite">Artists</Link>
              <Link href="/settings" className="rounded-full px-3 py-2 text-sm muted hover:text-offwhite">Settings</Link>
            </>
          )}
        </nav>
        <div className={user ? "" : "ml-auto"}>
          {user ? <MenuOverlay links={links} signOutAction={local ? undefined : signOut} email={user.email} /> : null}
        </div>
      </div>
    </header>
  );
}
