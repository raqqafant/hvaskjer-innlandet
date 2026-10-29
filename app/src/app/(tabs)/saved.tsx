import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EventCard } from '@/components/ui';
import { todayIso } from '@/lib/feed';
import { dayLabel, t } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

export default function SavedScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { feed, saved, lang } = useStore();
  const today = todayIso();
  const items = (feed?.events ?? [])
    .filter((e) => saved.has(e.id) && e.date >= today)
    .sort((a, b) => `${a.date}${a.time ?? '99'}`.localeCompare(`${b.date}${b.time ?? '99'}`));

  return (
    <FlatList
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 24, gap: 10 }}
      data={items}
      keyExtractor={(e) => e.id}
      ListHeaderComponent={<Text style={[styles.h1, { color: c.text }]} accessibilityRole="header">{t('tabSaved', lang)}</Text>}
      renderItem={({ item }) => (
        <View style={{ gap: 6 }}>
          <Text style={{ color: c.muted, fontSize: 13 }}>{dayLabel(item.date, lang, today)}</Text>
          <EventCard ev={item} />
        </View>
      )}
      ListEmptyComponent={<Text style={{ color: c.muted, fontSize: 15, lineHeight: 22 }}>{t('noSaved', lang)}</Text>}
    />
  );
}

const styles = StyleSheet.create({ h1: { fontSize: 28, fontWeight: '800', marginBottom: 8 } });
