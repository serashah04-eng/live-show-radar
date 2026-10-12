import Image from "next/image";
import type { ReactNode } from "react";
import { PHOTOS, photoUrl } from "@/lib/photos";

/** A photo tile with a dark overlay so text on it stays readable. The inner image drifts via data-gsap="parallax". */
export function PhotoTile({
  photo,
  children,
  className = "",
  priority = false,
}: {
  photo: keyof typeof PHOTOS;
  children?: ReactNode;
  className?: string;
  priority?: boolean;
}) {
  const p = PHOTOS[photo];
  return (
    <div className={`relative isolate overflow-hidden bg-charcoal ${className}`}>
      <div data-gsap="parallax" className="absolute inset-0 -z-10">
        <Image src={photoUrl(p.id)} alt={p.alt} fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" priority={priority} unoptimized />
      </div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/45 to-black/30" aria-hidden="true" />
      {children}
    </div>
  );
}
