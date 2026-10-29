import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { loadFeed, todayIso, type LoadedFeed } from './feed';
import type { EventItem, Lang } from './types';

export type When = 'all' | 'today' | 'weekend' | 'week';
export type Filters = { town: string | null; free: boolean; kids: boolean; when: When; query: string };
const NO_FILTERS: Filters = { town: null, free: false, kids: false, when: 'all', query: '' };

type Store = {
  feed: LoadedFeed | null;
  error: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
  lang: Lang;
  setLang: (l: Lang) => void;
  saved: Set<string>;
  toggleSaved: (id: string) => void;
  filters: Filters;
  setFilters: (f: Partial<Filters>) => void;
  clearFilters: () => void;
  visible: EventItem[];
  towns: string[];
};

const Ctx = createContext<Store | null>(null);

function deviceLang(): Lang {
  const code = getLocales()[0]?.languageCode ?? 'nb';
  return ['nb', 'nn', 'no'].includes(code) ? 'no' : 'en';
}

function inWindow(date: string, when: When, today: string): boolean {
  if (when === 'all') return true;
  if (when === 'today') return date === today;
  const t = new Date(`${today}T12:00:00`);
  const d = new Date(`${date}T12:00:00`);
  const diff = Math.round((d.getTime() - t.getTime()) / 86400000);
  if (when === 'week') return diff >= 0 && diff < 7;
  // weekend: the coming Friday to Sunday (or the current one)
  const dow = t.getDay(); // 0 = Sunday
  const toFri = dow === 0 ? -2 : dow === 6 ? -1 : 5 - dow;
  return diff >= Math.max(0, toFri) && diff <= toFri + 2;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [feed, setFeed] = useState<LoadedFeed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLangState] = useState<Lang>(deviceLang());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [filters, setFilterState] = useState<Filters>(NO_FILTERS);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setFeed(await loadFeed());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    AsyncStorage.multiGet(['saved', 'lang']).then((pairs) => {
      const s = pairs[0][1];
      const l = pairs[1][1];
      if (s) setSaved(new Set(JSON.parse(s) as string[]));
      if (l === 'no' || l === 'en') setLangState(l);
    }).catch(() => {});
  }, [refresh]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    AsyncStorage.setItem('lang', l).catch(() => {});
  }, []);

  const toggleSaved = useCallback((id: string) => {
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      AsyncStorage.setItem('saved', JSON.stringify([...next])).catch(() => {});
      return next;
    });
  }, []);

  const today = todayIso();
  const upcoming = useMemo(() => (feed?.events ?? []).filter((e) => e.date >= today), [feed, today]);
  const towns = useMemo(() => [...new Set(upcoming.map((e) => e.town))].sort((a, b) => a.localeCompare(b, 'nb')), [upcoming]);

  const visible = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return upcoming.filter((e) =>
      (!filters.town || e.town === filters.town) &&
      (!filters.free || e.free === true) &&
      (!filters.kids || e.audience === 'children' || e.category === 'family') &&
      inWindow(e.date, filters.when, today) &&
      (!q || [e.title, e.venue ?? '', e.town, e.summary_no, e.summary_en].some((s) => s.toLowerCase().includes(q))));
  }, [upcoming, filters, today]);

  const value: Store = {
    feed, error, loading, refresh, lang, setLang, saved, toggleSaved, filters,
    setFilters: (f) => setFilterState((prev) => ({ ...prev, ...f })),
    clearFilters: () => setFilterState(NO_FILTERS),
    visible, towns,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside StoreProvider');
  return s;
}
