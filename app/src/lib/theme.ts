import { useColorScheme } from 'react-native';

const light = {
  bg: '#F4F5F2', card: '#FFFFFF', text: '#1B2022', muted: '#5A6366', line: '#DDE1DB',
  accent: '#0B5D5A', accentText: '#FFFFFF', accentSoft: '#E6F1EF',
  kids: '#3B4A91', kidsSoft: '#ECEFFA', warn: '#8A3A09', warnSoft: '#FBEEE5',
  header: '#0F2A2E', headerText: '#F4F5F2', headerMuted: '#9FC9C4',
};
const dark: typeof light = {
  bg: '#101415', card: '#181E20', text: '#ECEFEC', muted: '#A2ABAD', line: '#2A3234',
  accent: '#6CC3BB', accentText: '#0B1A1B', accentSoft: '#173533',
  kids: '#AEB9F0', kidsSoft: '#232A47', warn: '#F2A673', warnSoft: '#3A2416',
  header: '#0B1E21', headerText: '#ECEFEC', headerMuted: '#8FBDB8',
};

export type Theme = typeof light;
export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}
