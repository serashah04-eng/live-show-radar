import Link from "next/link";
import { getCurrentUser, isAdminUser } from "@/lib/auth";
import { signOut } from "@/app/login/actions";
import { isLocalOwnerMode } from "@/lib/local-mode";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/feed", label: "Concert Feed" },
  { href: "/artists", label: "Artists" },
  { href: "/submit", label: "Add event" },
  { href: "/settings", label: "Settings" },
];

export async function Nav() {
  const user = await getCurrentUser();
  const admin = user ? await isAdminUser() : false;
  return (
    <header className="border-b border-line">
      <div className="wrap flex flex-wrap items-center gap-x-6 gap-y-2 py-3">
        <Link href="/" className="display text-2xl text-offwhite" aria-label="Live Show Radar home">
          Live Show <span className="text-orange">Radar</span>
        </Link>
        {user && (
          <nav aria-label="Main" className="order-last flex w-full flex-wrap items-center gap-1 sm:order-none sm:w-auto sm:flex-1">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-lg px-3 py-2 text-sm font-medium muted hover:bg-surface2 hover:text-offwhite">
                {l.label}
              </Link>
            ))}
            {admin && (
              <>
                <Link href="/review" className="rounded-lg px-3 py-2 text-sm font-medium text-orange hover:bg-surface2">
                  Review
                </Link>
                <Link href="/status" className="rounded-lg px-3 py-2 text-sm font-medium muted hover:bg-surface2 hover:text-offwhite">
                  Status
                </Link>
              </>
            )}
          </nav>
        )}
        {user && isLocalOwnerMode() && (
          <span className="badge-warn ml-auto" title="Development only. The public site always requires a login.">
            Local owner mode · no login
          </span>
        )}
        {user && !isLocalOwnerMode() && (
          <form action={signOut} className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs muted sm:inline">{user.email}</span>
            <button className="btn-ghost min-h-9 px-3" type="submit">
              Sign out
            </button>
          </form>
        )}
      </div>
    </header>
  );
}
