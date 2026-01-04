import { MD3LightTheme } from 'react-native-paper';
import colors from '@presentation/styles/colors';

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    onPrimary: colors.onPrimary,
    secondary: colors.secondary,
    onSecondary: colors.onSecondary,
    surface: colors.surface,
    background: colors.background,
    outline: colors.border,
    onSurface: colors.text,
    onSurfaceVariant: colors.textMuted,
    surfaceVariant: colors.surfaceAlt,
  },
};

export default theme;
