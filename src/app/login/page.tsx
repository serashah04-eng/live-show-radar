import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="grid items-center gap-10 py-6 md:grid-cols-2">
      <section className="mosaic rounded-2xl border border-line p-6 sm:p-10">
        <p className="mono">Concert alerts for India</p>
        <h1 className="wordmark mt-3 text-7xl sm:text-9xl">{APP_NAME}</h1>
        <p className="mt-4 text-2xl font-bold">{APP_TAGLINE}</p>
        <p className="mt-3 max-w-md muted">{APP_DESCRIPTION}</p>
      </section>
      <LoginForm />
    </div>
  );
}
