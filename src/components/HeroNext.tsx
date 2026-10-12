import Link from "next/link";
import type { FeedItem } from "@/lib/feed";
import { eventDateParts } from "@/lib/format";
import { artistImage } from "@/lib/artist-images";
import { ArtistPhoto } from "./ArtistPhoto";
import { EventLinks } from "./EventLinks";
import { FavHeart } from "./FavHeart";
import { StatusBadge } from "./StatusBadge";

/** The big, fun top of the dashboard: the next show for you, with a photo, the date and the three links. */
export function HeroNext({ item, isFav }: { item: FeedItem | null; isFav: boolean }) {
  if (!item) {
    return (
      <section className="hero-card relative overflow-hidden rounded-3xl border border-line p-6 sm:p-10">
        <p className="sticker">Welcome</p>
        <h1 className="display mt-3 !text-4xl sm:!text-5xl">Be first to every show in India</h1>
        <p className="mt-2 max-w-xl muted">Pick the artists you love and we watch for their India shows around the clock. The moment one is announced, you hear it from us.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/artists" className="btn-primary">Pick your artists</Link>
          <Link href="/feed" className="btn-ghost">Browse the calendar</Link>
        </div>
      </section>
    );
  }
  const e = item.event;
  const a = e.artists[0];
  const name = e.artists.map((x) => x.name).join(" + ") || e.title;
  const d = eventDateParts(e);
  const bg = a ? artistImage(a.name)?.url : undefined;
  return (
    <section className="hero-card relative overflow-hidden rounded-3xl border border-line" aria-label="Your next show">
      {bg && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={bg} alt="" aria-hidden="true" referrerPolicy="no-referrer" className="absolute inset-0 size-full scale-125 object-cover opacity-30 blur-2xl" />
      )}
      <div className="relative grid items-center gap-6 p-5 sm:grid-cols-[auto_1fr] sm:p-8">
        <div className="relative mx-auto w-44 sm:w-52">
          <span className="sticker">Next up</span>
          <div className="aspect-square -rotate-3 overflow-hidden rounded-3xl border-4 border-white/90 shadow-[6px_6px_0_rgba(0,0,0,0.45)] transition hover:rotate-0">
            <ArtistPhoto name={a?.name ?? e.title} />
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="mono !text-white/80">{isFav ? "Your next favourite show" : "The next show in India"}</p>
            <StatusBadge event={e} />
          </div>
          <p role="heading" aria-level={1} className="display mt-1 break-words !text-4xl leading-none text-white sm:!text-6xl">{name}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="rounded-xl bg-lime px-3 py-1.5 text-ink">
              <span className="display text-3xl leading-none">{d.day}</span>{" "}
              <span className="text-xs font-extrabold tracking-widest">{d.month} {d.year}</span>
            </span>
            <p className="text-sm text-white/90">
              {e.city ?? "City to be announced"}
              {e.venue ? <><br /><span className="text-white/70">{e.venue}</span></> : null}
            </p>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <EventLinks e={e} />
            {a && <FavHeart artistId={a.id} name={a.name} initial={isFav} />}
            <Link href={`/events/${e.id}`} className="btn-ghost !bg-black/30 !text-white">Details →</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
