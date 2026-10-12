import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isLocalOwnerMode } from "@/lib/local-mode";

const PUBLIC_PREFIXES = ["/login", "/auth"];

// Refreshes the Supabase session cookie and sends signed-out visitors to /login.
// This is an optimistic check only; every page, action and route re-verifies the user.
export async function proxy(request: NextRequest) {
  if (isLocalOwnerMode()) {
    // Local testing: no login. Send the login page to the dashboard.
    if (request.nextUrl.pathname === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));

  if (!signedIn && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (signedIn && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  // Skip static assets and the cron endpoint (it has its own secret-based auth).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
