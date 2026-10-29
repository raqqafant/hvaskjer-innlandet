import Ionicons from '@expo/vector-icons/Ionicons';
import * as Linking from 'expo-linking';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Badges, SaveButton } from '@/components/ui';
import { todayIso } from '@/lib/feed';
import { CATEGORY, dayLabel, t } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

export default function EventScreen() {
  const c = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { feed, lang } = useStore();
  const ev = feed?.events.find((e) => e.id === id);

  if (!ev) {
    return <View style={[styles.wrap, { backgroundColor: c.bg }]}><Text style={{ color: c.muted }}>{t('none', lang)}</Text></View>;
  }
  const when = `${dayLabel(ev.date, lang, todayIso())}${ev.time ? ` · ${ev.time}` : ` · ${t('noTime', lang)}`}`;
  const where = [ev.venue, ev.town].filter(Boolean).join(', ');
  const link = ev.links[0];

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.wrap}>
      <Stack.Screen options={{ title: CATEGORY[ev.category][lang], headerRight: () => <SaveButton id={ev.id} inHeader /> }} />
      <Text style={[styles.title, { color: c.text, textDecorationLine: ev.status === 'cancelled' ? 'line-through' : 'none' }]} accessibilityRole="header">
        {ev.title}
      </Text>
      <Row icon="calendar-outline" text={when} />
      {!!where && <Row icon="location-outline" text={where} />}
      <Badges ev={ev} lang={lang} />
      <Text style={[styles.body, { color: c.text }]}>{lang === 'no' ? ev.summary_no : ev.summary_en}</Text>
      {lang === 'en' && <Text style={[styles.alt, { color: c.muted }]}>{ev.summary_no}</Text>}

      <View style={[styles.checked, { backgroundColor: c.accentSoft }]}>
        <Ionicons name="checkmark-circle" size={18} color={c.accent} />
        <Text style={{ color: c.text, flex: 1 }}>
          {t('checked', lang)} {ev.links.map((l) => l.label).join(', ')}
        </Text>
      </View>

      {link && (
        <Pressable
          onPress={() => Linking.openURL(link.url)}
          accessibilityRole="link"
          style={({ pressed }) => [styles.primary, { backgroundColor: c.accent, opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={{ color: c.accentText, fontWeight: '700', fontSize: 16 }}>{t('openSource', lang)}</Text>
          <Ionicons name="open-outline" size={18} color={c.accentText} />
        </Pressable>
      )}
      <Pressable
        onPress={() => Share.share({ message: `${ev.title}\n${when}\n${where}${link ? `\n${link.url}` : ''}` })}
        accessibilityRole="button"
        style={({ pressed }) => [styles.secondary, { borderColor: c.line, backgroundColor: c.card, opacity: pressed ? 0.85 : 1 }]}
      >
        <Ionicons name="share-outline" size={18} color={c.text} />
        <Text style={{ color: c.text, fontWeight: '600', fontSize: 16 }}>{t('share', lang)}</Text>
      </Pressable>
      <Text style={[styles.note, { color: c.muted }]}>{t('checkBefore', lang)}</Text>
    </ScrollView>
  );
}

function Row({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  const c = useTheme();
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color={c.accent} />
      <Text style={{ color: c.text, fontSize: 16, flex: 1 }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 14 },
  title: { fontSize: 26, fontWeight: '800', lineHeight: 31 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  body: { fontSize: 17, lineHeight: 25, marginTop: 4 },
  alt: { fontSize: 15, lineHeight: 22, fontStyle: 'italic' },
  checked: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, marginTop: 4 },
  primary: { minHeight: 50, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondary: { minHeight: 50, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  note: { fontSize: 12, textAlign: 'center' },
});
