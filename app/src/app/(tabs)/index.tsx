import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip, EventCard } from '@/components/ui';
import { todayIso } from '@/lib/feed';
import { dayLabel, t } from '@/lib/i18n';
import { useStore, type When } from '@/lib/store';
import { useTheme } from '@/lib/theme';

export default function EventsScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { feed, error, loading, refresh, lang, setLang, filters, setFilters, clearFilters, visible, towns } = useStore();
  const today = todayIso();

  const sections = useMemo(() => {
    const byDay = new Map<string, typeof visible>();
    for (const e of visible) byDay.set(e.date, [...(byDay.get(e.date) ?? []), e]);
    return [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        title: dayLabel(date, lang, today),
        data: [...data].sort((a, b) => (a.time ?? '99').localeCompare(b.time ?? '99')),
      }));
  }, [visible, lang, today]);

  const down = (feed?.sources ?? []).filter((s) => !s.ok);
  const whens: { key: When; label: string }[] = [
    { key: 'all', label: t('all', lang) },
    { key: 'today', label: t('today', lang) },
    { key: 'weekend', label: t('weekend', lang) },
    { key: 'week', label: t('week', lang) },
  ];
  const filtered = filters.town || filters.free || filters.kids || filters.when !== 'all' || filters.query;

  const header = (
    <View>
      <View style={[styles.hero, { backgroundColor: c.header, paddingTop: insets.top + 16 }]}>
        <View style={styles.heroRow}>
          <Text style={[styles.kicker, { color: c.headerMuted }]}>Hamar · Ringsaker · Stange · Løten</Text>
          <Pressable
            onPress={() => setLang(lang === 'no' ? 'en' : 'no')}
            accessibilityRole="button"
            accessibilityLabel={t('language', lang)}
            style={[styles.langBtn, { borderColor: c.headerMuted }]}
          >
            <Text style={{ color: c.headerText, fontWeight: '600' }}>{lang === 'no' ? 'English' : 'Norsk'}</Text>
          </Pressable>
        </View>
        <Text style={[styles.h1, { color: c.headerText }]} accessibilityRole="header">{t('appTitle', lang)}</Text>
        <View style={[styles.search, { backgroundColor: c.card }]}>
          <Ionicons name="search" size={18} color={c.muted} />
          <TextInput
            value={filters.query}
            onChangeText={(q) => setFilters({ query: q })}
            placeholder={t('search', lang)}
            placeholderTextColor={c.muted}
            style={[styles.searchInput, { color: c.text }]}
            accessibilityLabel={t('search', lang)}
            returnKeyType="search"
          />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {whens.map((w) => <Chip key={w.key} label={w.label} on={filters.when === w.key} onPress={() => setFilters({ when: w.key })} />)}
        <View style={[styles.sep, { backgroundColor: c.line }]} />
        <Chip label={t('free', lang)} on={filters.free} onPress={() => setFilters({ free: !filters.free })} />
        <Chip label={t('kids', lang)} on={filters.kids} onPress={() => setFilters({ kids: !filters.kids })} />
      </ScrollView>
      {towns.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chips, { paddingTop: 0 }]}>
          <Chip label={t('all', lang)} on={!filters.town} onPress={() => setFilters({ town: null })} />
          {towns.map((town) => <Chip key={town} label={town} on={filters.town === town} onPress={() => setFilters({ town })} />)}
        </ScrollView>
      )}

      <View style={styles.notes}>
        {feed?.example && <Note tone="warn" text={t('example', lang)} />}
        {feed?.fromCache && <Note tone="warn" text={`${t('offline', lang)} ${feed.fetchedAt.slice(0, 10)}.`} />}
        {down.map((s) => <Note key={s.source} tone="warn" text={`${t('sourceDown', lang)} ${s.label}.`} />)}
        {!!feed && (
          <Text style={{ color: c.muted, fontSize: 14 }}>{visible.length} {t('upcoming', lang)}</Text>
        )}
      </View>
    </View>
  );

  if (!feed && loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator color={c.accent} />
        <Text style={{ color: c.muted, marginTop: 8 }}>{t('loading', lang)}</Text>
      </View>
    );
  }

  return (
    <SectionList
      style={{ backgroundColor: c.bg }}
      sections={sections}
      keyExtractor={(e) => e.id}
      ListHeaderComponent={header}
      stickySectionHeadersEnabled={false}
      renderSectionHeader={({ section }) => (
        <Text style={[styles.day, { color: c.text }]} accessibilityRole="header">{section.title}</Text>
      )}
      renderItem={({ item }) => <View style={styles.item}><EventCard ev={item} /></View>}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={{ color: c.muted, textAlign: 'center' }}>{error && !feed ? error : t('none', lang)}</Text>
          {filtered ? <Chip label={t('clear', lang)} on={false} onPress={clearFilters} /> : null}
        </View>
      }
      ListFooterComponent={<Text style={[styles.footer, { color: c.muted }]}>{t('checkBefore', lang)}</Text>}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={c.accent} />}
      contentContainerStyle={{ paddingBottom: 24 }}
    />
  );
}

function Note({ text, tone }: { text: string; tone: 'warn' }) {
  const c = useTheme();
  return (
    <View style={[styles.note, { backgroundColor: tone === 'warn' ? c.warnSoft : c.card, borderColor: c.warn }]}>
      <Text style={{ color: c.warn, fontSize: 13 }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 16, paddingBottom: 18, gap: 10 },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  kicker: { fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase', flexShrink: 1 },
  langBtn: { minHeight: 40, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, justifyContent: 'center' },
  h1: { fontSize: 30, fontWeight: '800', lineHeight: 34 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 12, minHeight: 46 },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 10 },
  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center' },
  sep: { width: 1, height: 24, marginHorizontal: 4 },
  notes: { paddingHorizontal: 16, gap: 8 },
  note: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  day: { fontSize: 19, fontWeight: '700', paddingHorizontal: 16, paddingTop: 22, paddingBottom: 8 },
  item: { paddingHorizontal: 16, paddingBottom: 10 },
  empty: { padding: 32, gap: 16, alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  footer: { fontSize: 12, textAlign: 'center', paddingHorizontal: 24, paddingTop: 16 },
});
