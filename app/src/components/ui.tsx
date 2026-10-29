import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CATEGORY, t } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';
import type { EventItem, Lang } from '@/lib/types';

export function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const c = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: on ? c.accent : c.card, borderColor: on ? c.accent : c.line, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Text style={[styles.chipText, { color: on ? c.accentText : c.text }]}>{label}</Text>
    </Pressable>
  );
}

type Tone = 'plain' | 'free' | 'kids' | 'warn';
function Badge({ label, tone }: { label: string; tone: Tone }) {
  const c = useTheme();
  const map = {
    plain: { fg: c.muted, bg: c.card, bd: c.line },
    free: { fg: c.accent, bg: c.accentSoft, bd: c.accent },
    kids: { fg: c.kids, bg: c.kidsSoft, bd: c.kids },
    warn: { fg: c.warn, bg: c.warnSoft, bd: c.warn },
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: map.bg, borderColor: map.bd }]}>
      <Text style={[styles.badgeText, { color: map.fg }]}>{label}</Text>
    </View>
  );
}

export function Badges({ ev, lang }: { ev: EventItem; lang: Lang }) {
  const out: { label: string; tone: Tone }[] = [];
  if (ev.free) out.push({ label: t('free', lang), tone: 'free' });
  else if (ev.price_from_nok != null) out.push({ label: `${t('from', lang)} ${ev.price_from_nok}`, tone: 'plain' });
  if (ev.audience === 'children' || ev.category === 'family') out.push({ label: t('kids', lang), tone: 'kids' });
  if (ev.status === 'sold_out') out.push({ label: t('soldOut', lang), tone: 'warn' });
  if (ev.status === 'cancelled') out.push({ label: t('cancelled', lang), tone: 'warn' });
  if (!out.length) return null;
  return <View style={styles.badges}>{out.map((b) => <Badge key={b.label} {...b} />)}</View>;
}

export function SaveButton({ id, inHeader = false }: { id: string; inHeader?: boolean }) {
  const c = useTheme();
  const { saved, toggleSaved, lang } = useStore();
  const on = saved.has(id);
  return (
    <Pressable
      onPress={() => toggleSaved(id)}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={on ? t('saved', lang) : t('save', lang)}
      accessibilityState={{ selected: on }}
      style={inHeader ? styles.iconBtnHeader : styles.iconBtn}
    >
      <Ionicons name={on ? 'heart' : 'heart-outline'} size={24} color={on ? c.warn : inHeader ? c.headerText : c.muted} />
    </Pressable>
  );
}

export function EventCard({ ev }: { ev: EventItem }) {
  const c = useTheme();
  const { lang } = useStore();
  const dim = ev.status === 'cancelled';
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.line }]}>
      <Link href={{ pathname: '/event/[id]', params: { id: ev.id } }} asChild>
        <Pressable style={styles.cardMain} accessibilityRole="link">
          <Text style={[styles.time, { color: c.accent }]}>{ev.time ?? '–'}</Text>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={[styles.title, { color: dim ? c.muted : c.text, textDecorationLine: dim ? 'line-through' : 'none' }]}>
              {ev.title}
            </Text>
            <Text style={[styles.meta, { color: c.muted }]} numberOfLines={1}>
              {CATEGORY[ev.category][lang]} · {[ev.venue, ev.town].filter(Boolean).join(', ')}
            </Text>
            <Badges ev={ev} lang={lang} />
          </View>
        </Pressable>
      </Link>
      <SaveButton id={ev.id} />
    </View>
  );
}

export const styles = StyleSheet.create({
  chip: { minHeight: 40, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, justifyContent: 'center' },
  chipText: { fontSize: 14, fontWeight: '500' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  card: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 },
  cardMain: { flex: 1, flexDirection: 'row', gap: 14 },
  time: { width: 52, fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
  title: { fontSize: 16, fontWeight: '600', lineHeight: 21 },
  meta: { fontSize: 13 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginTop: -10, marginRight: -8 },
  iconBtnHeader: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
});
