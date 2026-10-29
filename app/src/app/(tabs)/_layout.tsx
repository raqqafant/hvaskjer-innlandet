import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { t } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

export default function TabsLayout() {
  const c = useTheme();
  const { lang } = useStore();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.card, borderTopColor: c.line },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabEvents', lang), tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color as string} /> }} />
      <Tabs.Screen name="saved" options={{ title: t('tabSaved', lang), tabBarIcon: ({ color, size }) => <Ionicons name="heart-outline" size={size} color={color as string} /> }} />
      <Tabs.Screen name="about" options={{ title: t('tabAbout', lang), tabBarIcon: ({ color, size }) => <Ionicons name="information-circle-outline" size={size} color={color as string} /> }} />
    </Tabs>
  );
}
