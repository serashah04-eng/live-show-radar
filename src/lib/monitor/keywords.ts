import { ALL_INDIA_CITIES } from "../catalog/cities.ts";

/**
 * Keyword groups for the relevance gate (Step 1). Edit freely: every list is plain data.
 * Matching is case-insensitive and word-bounded. `why` explains each group for reviewers.
 */
export interface KeywordGroup {
  group: string;
  why: string;
  terms: string[];
}

export const ANNOUNCEMENT: KeywordGroup = {
  group: "announcement_intent",
  why: "The content announces or teases a live event.",
  terms: [
    "announces", "announced", "announcing", "tour", "india tour", "concert", "gig", "live in", "to perform", "set to perform",
    "will perform", "headline", "headlining", "debut in india", "returns to india", "comeback", "festival", "lineup", "line-up",
    "line up", "dates out", "dates announced", "city list", "tour dates", "live show", "live at", "performing live", "coming to",
    "kicks off", "world tour", "india leg",
  ],
};

export const TICKET_SALE: KeywordGroup = {
  group: "ticket_sale_intent",
  why: "The content gives sale details: when and how tickets can be bought.",
  terms: [
    "tickets", "ticket sale", "tickets go live", "tickets live", "on sale", "sale opens", "sale starts", "presale", "pre-sale", "pre sale",
    "early bird", "early-bird", "earlybird", "general sale", "registration open", "registrations open", "waitlist", "notify me", "phase 1",
    "phase 2", "phase one", "phase two", "tier pricing", "limited tickets", "sold out", "book now", "bookings open", "passes", "early access",
    "ticket link", "tickets from", "starting at rs", "starting from rs", "₹",
  ],
};

export const CARD_BANK: KeywordGroup = {
  group: "card_and_bank_offers",
  why: "Card and bank presales are often the first sale window.",
  terms: [
    "kotak", "hdfc", "icici", "axis bank", "sbi card", "amex", "american express", "visa", "rupay", "mastercard", "pixel", "solitaire",
    "white reserve", "idfc first", "yes bank", "indusind", "federal bank", "exclusive access", "cardholders", "card holders",
    "priority access", "credit card", "debit card", "% off", "smartbuy", "cardmember",
  ],
};

export const EVENT_TYPES: KeywordGroup = {
  group: "event_types",
  why: "Which kinds of live events count.",
  terms: [
    "concert", "live show", "tour", "music festival", "dj set", "club night", "stand-up", "stand up", "comedy tour", "comedy show",
    "theatre", "theater", "musical", "classical evening", "ghazal", "ghazal night", "qawwali", "carnatic", "hindustani", "sufi night",
    "mushaira", "folk night", "rave", "open air", "unplugged", "acoustic night", "garba", "navratri night", "regional-language show",
  ],
};

export const SOFT_LAUNCH: KeywordGroup = {
  group: "soft_launch_teaser",
  why: "Official teasers appear before the formal announcement.",
  terms: [
    "save the date", "something big is coming", "something big", "announcement soon", "big announcement", "registration opens",
    "registrations open", "join the waitlist", "countdown", "coming soon", "stay tuned", "watch this space", "details soon", "teaser",
    "dates drop", "lineup drop", "line-up drop",
  ],
};

export const CHANGES: KeywordGroup = {
  group: "changes_high_priority",
  why: "Cancellations, postponements and venue/date changes are never dropped and are high priority.",
  terms: [
    "cancelled", "canceled", "cancellation", "postponed", "postponement", "rescheduled", "reschedule", "venue change", "venue changed",
    "new venue", "new date", "date change", "date changed", "shifted to", "moved to", "called off", "no longer taking place", "refund",
    "refunds", "stands cancelled", "has been cancelled", "will not take place",
  ],
};

export const NEGATIVE: KeywordGroup = {
  group: "negative_filters",
  why: "Recaps, reviews, photo posts, giveaways and resale are not announcements. Changes (above) override these.",
  terms: [
    "review:", "concert review", "recap", "highlights", "last night", "photos from", "in pictures", "photo gallery", "throwback",
    "giveaway", "win tickets", "contest", "sweepstake", "resale", "re-sale", "scalper", "scalping", "black market", "tickets for sale on",
    "sold out last night", "was spotted", "fans react", "watch the video", "full set", "setlist from",
  ],
};

/** Places outside India: content whose only location is one of these fails the gate. */
export const FOREIGN_PLACES = [
  "dubai", "abu dhabi", "sharjah", "doha", "muscat", "riyadh", "jeddah", "kuwait", "bahrain", "london", "manchester", "birmingham",
  "new york", "los angeles", "san francisco", "chicago", "houston", "dallas", "toronto", "vancouver", "sydney", "melbourne", "singapore",
  "kuala lumpur", "bangkok", "hong kong", "tokyo", "seoul", "paris", "berlin", "amsterdam", "dublin", "kathmandu", "colombo", "dhaka",
  "karachi", "lahore", "johannesburg", "nairobi", "auckland", "las vegas", "atlanta", "new jersey", "usa", "uk", "canada", "australia",
  "uae", "europe", "north america",
];

/** Indian states and union territories (an India match when no city is named). */
export const INDIA_STATES = [
  "karnataka", "maharashtra", "tamil nadu", "telangana", "andhra pradesh", "kerala", "goa", "gujarat", "rajasthan", "punjab", "haryana",
  "himachal pradesh", "uttarakhand", "uttar pradesh", "madhya pradesh", "chhattisgarh", "bihar", "jharkhand", "west bengal", "odisha",
  "assam", "meghalaya", "manipur", "mizoram", "nagaland", "arunachal pradesh", "sikkim", "tripura", "jammu and kashmir", "ladakh",
  "chandigarh", "puducherry", "delhi ncr", "india",
];

/** Extra city names and aliases (old names, areas) not in the picker list. */
export const CITY_ALIASES = ["bangalore", "bombay", "madras", "calcutta", "gurgaon", "new delhi", "navi mumbai", "thane", "trivandrum", "cochin", "vizag", "mohali", "panchkula", "greater noida", "ncr", "mysore", "pondicherry"];

export interface Venue {
  name: string;
  city: string;
  /** true when the venue name alone identifies the place (otherwise the city must match too). */
  unambiguous: boolean;
}

/** Seed venue list (from the research brief). The registry adds verified venues from research/sources.json at runtime. */
export const SEED_VENUES: Venue[] = [
  { name: "NICE Grounds", city: "Bengaluru", unambiguous: true },
  { name: "BIEC", city: "Bengaluru", unambiguous: false },
  { name: "Bhartiya City", city: "Bengaluru", unambiguous: true },
  { name: "Bhartiya Mall of Bengaluru", city: "Bengaluru", unambiguous: true },
  { name: "Terraform", city: "Bengaluru", unambiguous: false },
  { name: "Manpho Convention Centre", city: "Bengaluru", unambiguous: true },
  { name: "KTPO", city: "Bengaluru", unambiguous: false },
  { name: "Phoenix Marketcity", city: "", unambiguous: false },
  { name: "The Humming Tree", city: "Bengaluru", unambiguous: true },
  { name: "Palace Grounds", city: "Bengaluru", unambiguous: false },
  { name: "Kanteerava Stadium", city: "Bengaluru", unambiguous: true },
  { name: "Chinnaswamy Stadium", city: "Bengaluru", unambiguous: true },
  { name: "DY Patil Stadium", city: "Navi Mumbai", unambiguous: false },
  { name: "Mahalaxmi Racecourse", city: "Mumbai", unambiguous: true },
  { name: "NSCI Dome", city: "Mumbai", unambiguous: true },
  { name: "Jio World Garden", city: "Mumbai", unambiguous: true },
  { name: "Jio World Convention Centre", city: "Mumbai", unambiguous: true },
  { name: "MMRDA Grounds", city: "Mumbai", unambiguous: false },
  { name: "Mehboob Studio", city: "Mumbai", unambiguous: true },
  { name: "NCPA", city: "Mumbai", unambiguous: false },
  { name: "JLN Stadium", city: "Delhi", unambiguous: false },
  { name: "Indira Gandhi Arena", city: "Delhi", unambiguous: true },
  { name: "Talkatora Stadium", city: "Delhi", unambiguous: true },
  { name: "Siri Fort Auditorium", city: "Delhi", unambiguous: true },
  { name: "Kingdom of Dreams", city: "Gurugram", unambiguous: true },
  { name: "Narendra Modi Stadium", city: "Ahmedabad", unambiguous: true },
  { name: "EKA Arena", city: "Ahmedabad", unambiguous: true },
  { name: "Gachibowli Stadium", city: "Hyderabad", unambiguous: true },
  { name: "HICC", city: "Hyderabad", unambiguous: false },
  { name: "Shilpakala Vedika", city: "Hyderabad", unambiguous: true },
  { name: "YMCA Nandanam", city: "Chennai", unambiguous: true },
  { name: "Salt Lake Stadium", city: "Kolkata", unambiguous: false },
  { name: "Nicco Park", city: "Kolkata", unambiguous: true },
  { name: "Balewadi Stadium", city: "Pune", unambiguous: true },
  { name: "Jawahar Kala Kendra", city: "Jaipur", unambiguous: true },
  { name: "Kala Academy", city: "Goa", unambiguous: true },
];

/** Artist watchlist: the editable catalogue plus a clearly marked starter suggestion list. */
export const STARTER_WATCHLIST_SUGGESTION = {
  note: "SUGGESTION ONLY, for the owner to review. A watchlist hit raises priority; an artist not listed here can still pass the gate.",
  artists: [
    "Arijit Singh", "Diljit Dosanjh", "AP Dhillon", "Karan Aujla", "Prateek Kuhad", "Anuv Jain", "Seedhe Maut", "Divine", "Raftaar", "Ritviz",
    "Nucleya", "Coldplay", "Ed Sheeran", "Guns N' Roses", "Foo Fighters", "Maroon 5", "Shreya Ghoshal", "Martin Garrix", "Alan Walker", "Zedd",
  ],
};

export const ALL_GROUPS: KeywordGroup[] = [ANNOUNCEMENT, TICKET_SALE, CARD_BANK, EVENT_TYPES, SOFT_LAUNCH, CHANGES, NEGATIVE];
export const INDIA_CITY_TERMS = [...new Set([...ALL_INDIA_CITIES, ...CITY_ALIASES].map((c) => c.toLowerCase()))];
