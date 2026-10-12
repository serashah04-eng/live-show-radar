import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { APP_NAME } from "@/lib/brand";
import { isLocalOwnerMode } from "@/lib/local-mode";
import { isTrialMode } from "@/lib/trial";
import { NavLinks } from "./NavLinks";
import { ThemeToggle } from "./ThemeToggle";
import { MenuOverlay, type MenuLink } from "./MenuOverlay";

export async function Nav() {
  const user = await getCurrentUser();
  const admin = user ? await isAdminUser() : false;
  const local = isLocalOwnerMode();

  const links: MenuLink[] = user
    ? [
        { href: "/", label: "Dashboard", hint: "your radar" },
        { href: "/feed", label: "Concert feed", hint: "every show, filtered" },
        { href: "/favourites", label: "Favourites", hint: "your collection" },
        { href: "/artists", label: "Artists", hint: "browse and add" },
        { href: "/start", label: "Pick your scene", hint: "cities and artists" },
        { href: "/submit", label: "Add event", hint: "found a show? paste the link" },
        { href: "/settings", label: "Settings", hint: "alerts and preferences" },
        ...(admin ? [{ href: "/review", label: "Review", hint: "owner only" }, { href: "/status", label: "Status", hint: "owner only" }] : []),
      ]
    : [];

  return (
    <header className="border-b border-line">
      <div className="wrap flex items-center gap-3 py-3">
        {user ? <MenuOverlay links={links} signOutAction={local ? undefined : signOut} email={user.email} /> : null}
        <Link href="/" className="wordmark text-3xl sm:text-4xl" aria-label={`${APP_NAME} home`}>
          {APP_NAME}
        </Link>
        {user && local && (
          <span className="badge-warn" title="Development only. The public site always requires a login.">
            Local owner mode
          </span>
        )}
        {user && !local && isTrialMode() && (
          <span className="badge-warn" title="Any email and any password works here. Not for real data.">Trial build</span>
        )}
        {user && (
          <form action="/search" method="get" role="search" className="ml-auto hidden flex-1 sm:block sm:max-w-xs">
            <label htmlFor="global-search" className="sr-only">Search artists, cities and venues</label>
            <input id="global-search" name="q" type="search" placeholder="Search artist, city or venue" className="field !min-h-8 !rounded-full !px-3 !text-xs" />
          </form>
        )}
        <nav aria-label="Main" className={`${user ? "" : "ml-auto"} hidden items-center gap-0.5 lg:flex`}>
          {user && (
            <NavLinks
              items={[
                { href: "/", label: "Dashboard" },
                { href: "/feed", label: "Feed" },
                { href: "/start", label: "Pick your scene" },
                { href: "/favourites", label: "Favourites" },
                { href: "/artists", label: "Artists" },
              ]}
            />
          )}
        </nav>
        <div className={user ? "ml-auto sm:ml-0" : "ml-auto"}>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
