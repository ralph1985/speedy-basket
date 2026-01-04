import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from 'react-native-paper';
import type { ProductDetail as ProductDetailType } from '@domain/types';
import colors from '@presentation/styles/colors';
import type { TFunction } from '@presentation/i18n';

type Props = {
  detail: ProductDetailType;
  onFound: () => void;
  onNotFound: () => void;
  onBack: () => void;
  t: TFunction;
};

export default function ProductDetail({ detail, onFound, onNotFound, onBack, t }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{detail.name}</Text>
      <Text style={styles.meta}>
        {t('label.suggestedZone')}: {detail.zoneName ?? '-'}
      </Text>
      <Text style={styles.meta}>
        {t('label.category')}: {detail.category ?? '-'}
      </Text>
      <View style={styles.actions}>
        <Button mode="contained" onPress={onFound}>
          <Text>{t('action.found')}</Text>
        </Button>
        <Button mode="contained" onPress={onNotFound}>
          <Text>{t('action.notFound')}</Text>
        </Button>
      </View>
      <Pressable onPress={onBack}>
        <Text style={styles.backLink}>{t('action.backToList')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  backLink: {
    color: colors.primary,
    marginTop: 8,
  },
  container: {
    gap: 10,
  },
  meta: {
    color: colors.textMuted,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
});
