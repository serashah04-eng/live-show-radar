import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="grid items-center gap-10 py-6 md:grid-cols-2">
      <section>
        <p className="badge-urgent mb-4">Indie-first · India · Bengaluru first</p>
        <h1 className="text-5xl sm:text-6xl">
          Never hear about a show from someone else&apos;s story.
        </h1>
        <p className="mt-5 max-w-md text-lg muted">
          Follow your artists. Get a Telegram or email alert the moment a show is announced in India, with the early-bird window flagged only when it is verified.
        </p>
      </section>
      <LoginForm />
    </div>
  );
}
