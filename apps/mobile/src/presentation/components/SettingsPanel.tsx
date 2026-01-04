import { StyleSheet, Text, View } from 'react-native';
import { SegmentedButtons } from 'react-native-paper';
import type { Language, TFunction } from '@presentation/i18n';
import colors from '@presentation/styles/colors';

type Props = {
  language: Language;
  onChangeLanguage: (language: Language) => void;
  t: TFunction;
};

export default function SettingsPanel({ language, onChangeLanguage, t }: Props) {
  return (
    <View style={styles.panel}>
      <Text style={styles.title}>{t('settings.title')}</Text>
      <View style={styles.section}>
        <Text style={styles.meta}>{t('settings.language')}</Text>
        <SegmentedButtons
          value={language}
          onValueChange={(value) => onChangeLanguage(value as Language)}
          buttons={[
            { value: 'es', label: t('language.es') },
            { value: 'en', label: t('language.en') },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  meta: {
    color: colors.textMuted,
  },
  panel: {
    flex: 1,
    gap: 12,
  },
  section: {
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
});
