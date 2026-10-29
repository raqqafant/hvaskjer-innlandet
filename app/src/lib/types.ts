// The feed format. It is the same as `out/events.json` from the events harness,
// so the app can read the daily feed that the harness publishes.

export type Category =
  | 'concert' | 'theatre' | 'dance' | 'family' | 'comedy' | 'talk'
  | 'exhibition' | 'film' | 'course' | 'social' | 'other';

export type EventLink = { source: string; label: string; url: string };

export type EventItem = {
  id: string;
  title: string;
  date: string;            // YYYY-MM-DD, local time in Norway
  time: string | null;     // HH:MM start time, or null if the source gives none
  town: string;
  venue: string | null;
  free: boolean | null;
  price_from_nok: number | null;
  status: 'scheduled' | 'sold_out' | 'cancelled';
  category: Category;
  audience: 'children' | 'youth' | 'adults' | 'all' | null;
  summary_no: string;
  summary_en: string;
  links: EventLink[];
};

export type SourceStatus = { source: string; label: string; town: string; ok: boolean; error?: string | null };

export type Feed = {
  today: string;
  sources: SourceStatus[];
  events: EventItem[];
  example?: boolean;       // true for the bundled example data
};

export type Lang = 'no' | 'en';
