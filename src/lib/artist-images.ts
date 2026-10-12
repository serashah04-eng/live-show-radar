import images from "./catalog/artist-images.json";
import { normalizeName } from "./discovery/normalize";

const map = images as Record<string, { url: string; page: string }>;

/** Wikipedia/Wikimedia Commons photo for an artist, or null (the UI then shows a monogram). Never a guess. */
export function artistImage(name: string): { url: string; page: string } | null {
  return map[normalizeName(name)] ?? null;
}
