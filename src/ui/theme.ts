import { MD3LightTheme, type MD3Theme } from 'react-native-paper';

export const tema: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#A63D6B',
    onPrimary: '#FFFFFF',
    primaryContainer: '#FFD9E4',
    onPrimaryContainer: '#3E001F',
    secondary: '#74565F',
    secondaryContainer: '#FFD9E2',
    onSecondaryContainer: '#2B151C',
    background: '#FFF8F8',
    surface: '#FFF8F8',
    surfaceVariant: '#F2DDE1',
    error: '#BA1A1A',
  },
};

export const espaco = { xs: 4, s: 8, m: 16, l: 24 };
