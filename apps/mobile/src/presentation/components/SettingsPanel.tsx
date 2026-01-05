import { StyleSheet, Text, View } from 'react-native';
import { Button, RadioButton, SegmentedButtons } from 'react-native-paper';
import type { Language, TFunction } from '@presentation/i18n';
import colors from '@presentation/styles/colors';

type Props = {
  stores: Array<{ id: number; name: string }>;
  activeStoreId: number | null;
  onChangeStore: (storeId: number) => void;
  language: Language;
  onChangeLanguage: (language: Language) => void;
  onSignOut: () => void;
  t: TFunction;
};

export default function SettingsPanel({
  stores,
  activeStoreId,
  onChangeStore,
  language,
  onChangeLanguage,
  onSignOut,
  t,
}: Props) {
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
      <View style={styles.section}>
        <Text style={styles.meta}>{t('settings.store')}</Text>
        <RadioButton.Group
          value={activeStoreId ? `${activeStoreId}` : ''}
          onValueChange={(value) => {
            if (value) onChangeStore(Number(value));
          }}
        >
          {stores.map((store) => (
            <RadioButton.Item
              key={store.id}
              label={store.name}
              value={`${store.id}`}
            />
          ))}
        </RadioButton.Group>
      </View>
      <View style={styles.section}>
        <Text style={styles.meta}>{t('settings.account')}</Text>
        <Button mode="outlined" onPress={onSignOut}>
          {t('settings.signOut')}
        </Button>
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
