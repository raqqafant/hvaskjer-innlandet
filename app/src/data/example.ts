import type { EventItem, Feed } from '@/lib/types';

// Made-up events, shown only while no feed URL is configured.
// Dates are relative to today so the example always looks current.
type Ex = Omit<EventItem, 'id' | 'date' | 'links'> & { inDays: number; source: string };

const EX: Ex[] = [
  { inDays: 0, time: '19:30', title: 'Jazzkveld i foajeen', town: 'Hamar', venue: 'Eksempelhuset', free: false, price_from_nok: 250, status: 'scheduled', category: 'concert', audience: 'adults', source: 'Eksempelhuset',
    summary_no: 'En avslappet kveld med jazzstandarder og en lokal trio.', summary_en: 'A relaxed evening of jazz standards with a local trio.' },
  { inDays: 1, time: '12:00', title: 'Familielørdag: lag din egen lykt', town: 'Hamar', venue: 'Eksempelbiblioteket', free: true, price_from_nok: null, status: 'scheduled', category: 'family', audience: 'children', source: 'Eksempelbiblioteket',
    summary_no: 'Lag din egen papirlykt. Alt materiell er med.', summary_en: 'Make your own paper lantern. All materials are provided.' },
  { inDays: 1, time: '18:00', title: 'Språkkafé', town: 'Hamar', venue: 'Eksempelbiblioteket', free: true, price_from_nok: null, status: 'scheduled', category: 'social', audience: 'all', source: 'Eksempelbiblioteket',
    summary_no: 'Øv på norsk over en kopp kaffe. Alle er velkomne, ingen påmelding.', summary_en: 'Practise Norwegian over coffee. Everyone is welcome, no sign-up.' },
  { inDays: 1, time: '20:00', title: 'Standup: høstturné', town: 'Brumunddal', venue: 'Eksempelscenen', free: false, price_from_nok: 390, status: 'sold_out', category: 'comedy', audience: 'adults', source: 'Eksempelscenen',
    summary_no: 'En kveld med nytt standup-materiale.', summary_en: 'An evening of new stand-up material.' },
  { inDays: 2, time: '11:00', title: 'Omvisning: kunst fra regionen', town: 'Hamar', venue: 'Eksempelkunstsenteret', free: true, price_from_nok: null, status: 'scheduled', category: 'exhibition', audience: 'all', source: 'Eksempelkunstsenteret',
    summary_no: 'En times omvisning i den nye utstillingen.', summary_en: 'A one-hour guided tour of the current exhibition.' },
  { inDays: 2, time: '14:00', title: 'Barneteater: Reven og haren', town: 'Stange', venue: 'Eksempelteatret', free: false, price_from_nok: 150, status: 'scheduled', category: 'theatre', audience: 'children', source: 'Eksempelteatret',
    summary_no: 'En kort og leken forestilling for barn fra tre år.', summary_en: 'A short, playful show for children from three years.' },
  { inDays: 4, time: '19:00', title: 'Foredrag: Mjøsa før og nå', town: 'Løten', venue: 'Eksempelbiblioteket', free: false, price_from_nok: 100, status: 'cancelled', category: 'talk', audience: 'adults', source: 'Eksempelbiblioteket',
    summary_no: 'Foredraget er avlyst. Billetter refunderes.', summary_en: 'This talk is cancelled. Tickets are refunded.' },
  { inDays: 6, time: null, title: 'Høstutstilling i galleriet', town: 'Moelv', venue: 'Eksempelgalleriet', free: true, price_from_nok: null, status: 'scheduled', category: 'exhibition', audience: 'all', source: 'Eksempelgalleriet',
    summary_no: 'Malerier og grafikk fra lokale kunstnere.', summary_en: 'Paintings and prints by local artists.' },
];

export function exampleFeed(todayIso: string): Feed {
  const base = new Date(`${todayIso}T12:00:00`);
  const events = EX.map(({ inDays, source, ...e }, i) => {
    const d = new Date(base.getTime() + inDays * 86400000);
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { ...e, id: `example:${i}:${date}`, date, links: [{ source: 'example', label: source, url: 'https://example.org/' }] };
  });
  return {
    today: todayIso,
    example: true,
    sources: [
      { source: 'example', label: 'Eksempeldata', town: 'Hamar', ok: true },
      { source: 'example_down', label: 'Eksempelkilde', town: 'Lillehammer', ok: false },
    ],
    events,
  };
}
