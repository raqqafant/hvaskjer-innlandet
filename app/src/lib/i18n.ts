import type { Category, Lang } from './types';

const DAYS = {
  no: ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};
const MONTHS = {
  no: ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

export const CATEGORY: Record<Category, { no: string; en: string }> = {
  concert: { no: 'Konsert', en: 'Concert' },
  theatre: { no: 'Teater', en: 'Theatre' },
  dance: { no: 'Dans', en: 'Dance' },
  family: { no: 'Familie', en: 'Family' },
  comedy: { no: 'Humor', en: 'Comedy' },
  talk: { no: 'Foredrag', en: 'Talk' },
  exhibition: { no: 'Utstilling', en: 'Exhibition' },
  film: { no: 'Film', en: 'Film' },
  course: { no: 'Kurs', en: 'Course' },
  social: { no: 'Sosialt', en: 'Social' },
  other: { no: 'Annet', en: 'Other' },
};

const T = {
  appTitle: { no: 'Hva skjer i Innlandet', en: "What's on in Innlandet" },
  tabEvents: { no: 'Hva skjer', en: "What's on" },
  tabSaved: { no: 'Lagret', en: 'Saved' },
  tabAbout: { no: 'Om', en: 'About' },
  search: { no: 'Søk etter arrangement eller sted', en: 'Search events or places' },
  all: { no: 'Alle', en: 'All' },
  today: { no: 'I dag', en: 'Today' },
  weekend: { no: 'Helgen', en: 'Weekend' },
  week: { no: '7 dager', en: '7 days' },
  free: { no: 'Gratis', en: 'Free' },
  kids: { no: 'For barn', en: 'For children' },
  soldOut: { no: 'Utsolgt', en: 'Sold out' },
  cancelled: { no: 'Avlyst', en: 'Cancelled' },
  from: { no: 'Fra kr', en: 'From NOK' },
  upcoming: { no: 'kommende arrangementer', en: 'upcoming events' },
  none: { no: 'Ingen arrangementer passer filtrene.', en: 'No events match these filters.' },
  clear: { no: 'Nullstill filtre', en: 'Clear filters' },
  checked: { no: 'Sjekket mot', en: 'Checked against' },
  openSource: { no: 'Åpne arrangørens side', en: "Open the organiser's page" },
  share: { no: 'Del', en: 'Share' },
  save: { no: 'Lagre', en: 'Save' },
  saved: { no: 'Lagret', en: 'Saved' },
  noSaved: { no: 'Du har ikke lagret noe ennå. Trykk på hjertet på et arrangement.', en: 'Nothing saved yet. Tap the heart on an event.' },
  example: { no: 'Eksempeldata: arrangementene er oppdiktet.', en: 'Example data: these events are made up.' },
  sourceDown: { no: 'Kilde utilgjengelig i dag:', en: 'Source unavailable today:' },
  offline: { no: 'Viser lagret program fra', en: 'Showing the saved programme from' },
  loading: { no: 'Henter program …', en: 'Loading programme …' },
  noTime: { no: 'Tid ikke oppgitt', en: 'Time not given' },
  checkBefore: { no: 'Sjekk alltid arrangørens side før du drar.', en: "Always check the organiser's page before you go." },
  language: { no: 'Språk', en: 'Language' },
  sources: { no: 'Kilder', en: 'Sources' },
  aboutText: {
    no: 'Appen samler arrangementer fra offentlige nettsider til arrangører i Innlandet. En KI-agent leser hver side, og kode sjekker at hver dato, hvert klokkeslett og hver pris står på arrangørens egen side før det vises her.',
    en: "The app collects events from organisers' public web pages in Innlandet. An AI agent reads each page, and code checks that every date, time and price appears on the organiser's own page before it is shown here.",
  },
} as const;

export type Key = keyof typeof T;
export const t = (key: Key, lang: Lang) => T[key][lang];

export function dayLabel(iso: string, lang: Lang, todayIso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  const diff = Math.round((d.getTime() - new Date(`${todayIso}T12:00:00`).getTime()) / 86400000);
  if (diff === 0) return lang === 'no' ? 'I dag' : 'Today';
  if (diff === 1) return lang === 'no' ? 'I morgen' : 'Tomorrow';
  const day = DAYS[lang][d.getDay()];
  const month = MONTHS[lang][d.getMonth()];
  return lang === 'no'
    ? `${day[0].toUpperCase()}${day.slice(1)} ${d.getDate()}. ${month}`
    : `${day} ${d.getDate()} ${month}`;
}
