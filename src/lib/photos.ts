/**
 * Placeholder concert photos from Unsplash (free to use under the Unsplash licence, no attribution required).
 * They are decoration only and say nothing about any real show. Swap for your own photos any time.
 */
export const PHOTOS = {
  stage: { id: "photo-1470229722913-7c0e2dbbafd3", alt: "Stage lights in front of an audience" },
  crowd: { id: "photo-1501386761578-eac5c94b800a", alt: "Excited crowd cheering at a concert" },
  field: { id: "photo-1533174072545-7a4b6ad7a6c3", alt: "People gathering on a festival field" },
  band: { id: "photo-1524368535928-5b5e00ddc76b", alt: "A band performing on stage" },
  front: { id: "photo-1514525253161-7a46d19cd819", alt: "A group of people in front of a stage" },
  lights: { id: "photo-1540039155733-5bb30b53aa14", alt: "A crowd facing a lit stage" },
} as const;

export const photoUrl = (id: string, w = 1200) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;
