import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { exampleFeed } from '@/data/example';
import type { Feed } from './types';

const CACHE_KEY = 'feed:v1';
const TIMEOUT_MS = 12000;

export type LoadedFeed = Feed & { fetchedAt: string; fromCache: boolean };

export function todayIso(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function feedUrl(): string {
  return String(Constants.expoConfig?.extra?.feedUrl ?? '').trim();
}

// Minimal shape check: a bad or half-written feed must never replace a good cached one.
function isFeed(x: unknown): x is Feed {
  const f = x as Feed;
  return !!f && Array.isArray(f.events) && Array.isArray(f.sources) &&
    f.events.every((e) => typeof e.id === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.date) && typeof e.title === 'string');
}

export async function loadFeed(): Promise<LoadedFeed> {
  const url = feedUrl();
  const today = todayIso();
  if (!url) return { ...exampleFeed(today), fetchedAt: new Date().toISOString(), fromCache: false };

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: unknown = await res.json();
    if (!isFeed(data)) throw new Error('feed has the wrong shape');
    const loaded: LoadedFeed = { ...data, fetchedAt: new Date().toISOString(), fromCache: false };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(loaded)).catch(() => {});
    return loaded;
  } catch (err) {
    const cached = await AsyncStorage.getItem(CACHE_KEY).catch(() => null);
    if (cached) return { ...(JSON.parse(cached) as LoadedFeed), fromCache: true };
    throw err;
  }
}
