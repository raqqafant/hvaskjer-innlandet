import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip } from '@/components/ui';
import { t } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

export default function AboutScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { feed, lang, setLang } = useStore();
  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={[styles.wrap, { paddingTop: insets.top + 16 }]}>
      <Text style={[styles.h1, { color: c.text }]} accessibilityRole="header">{t('tabAbout', lang)}</Text>
      <Text style={[styles.p, { color: c.text }]}>{t('aboutText', lang)}</Text>

      <Text style={[styles.h2, { color: c.text }]}>{t('language', lang)}</Text>
      <View style={styles.row}>
        <Chip label="Norsk" on={lang === 'no'} onPress={() => setLang('no')} />
        <Chip label="English" on={lang === 'en'} onPress={() => setLang('en')} />
      </View>

      <Text style={[styles.h2, { color: c.text }]}>{t('sources', lang)}</Text>
      {(feed?.sources ?? []).map((s) => (
        <View key={s.source} style={[styles.src, { borderColor: c.line, backgroundColor: c.card }]}>
          <Text style={{ color: c.text, fontWeight: '600' }}>{s.label}</Text>
          <Text style={{ color: s.ok ? c.accent : c.warn }}>{s.town} · {s.ok ? 'OK' : t('sourceDown', lang).replace(':', '')}</Text>
        </View>
      ))}
      <Text style={[styles.small, { color: c.muted }]}>{t('checkBefore', lang)}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 12, paddingBottom: 32 },
  h1: { fontSize: 28, fontWeight: '800' },
  h2: { fontSize: 18, fontWeight: '700', marginTop: 12 },
  p: { fontSize: 16, lineHeight: 24 },
  row: { flexDirection: 'row', gap: 8 },
  src: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 2 },
  small: { fontSize: 12, marginTop: 12 },
});
