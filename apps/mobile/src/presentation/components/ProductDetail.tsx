import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from 'react-native-paper';
import type { ProductDetail as ProductDetailType } from '@domain/types';
import colors from '@presentation/styles/colors';

type Props = {
  detail: ProductDetailType;
  onFound: () => void;
  onNotFound: () => void;
  onBack: () => void;
};

export default function ProductDetail({ detail, onFound, onNotFound, onBack }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{detail.name}</Text>
      <Text style={styles.meta}>Zona sugerida: {detail.zoneName ?? '-'}</Text>
      <Text style={styles.meta}>Categoria: {detail.category ?? '-'}</Text>
      <View style={styles.actions}>
        <Button mode="contained" onPress={onFound}>
          <Text>Encontrado</Text>
        </Button>
        <Button mode="contained" onPress={onNotFound}>
          <Text>No esta</Text>
        </Button>
      </View>
      <Pressable onPress={onBack}>
        <Text style={styles.backLink}>Volver a lista</Text>
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
