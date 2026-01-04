import { StyleSheet, Text, View } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import type { ZoneItem } from '@domain/types';
import colors from '@presentation/styles/colors';
import type { TFunction } from '@presentation/i18n';

type Props = {
  zones: ZoneItem[];
  activeZoneId: number | null;
  onSelectZone: (zoneId: number) => void;
  t: TFunction;
};

export default function MapPanel({ zones, activeZoneId, onSelectZone, t }: Props) {
  const columns = 2;
  const cellWidth = 120;
  const cellHeight = 80;
  const padding = 10;
  const width = columns * cellWidth + (columns + 1) * padding;
  const rows = Math.max(1, Math.ceil(zones.length / columns));
  const height = rows * cellHeight + (rows + 1) * padding;

  return (
    <View style={styles.panel}>
      <Text style={styles.meta}>
        {t('label.activeZone')}: {activeZoneId ?? '-'}
      </Text>
      <View style={styles.canvas}>
        <Svg width={width} height={height}>
          {zones.map((zone, index) => {
            const row = Math.floor(index / columns);
            const col = index % columns;
            const x = padding + col * (cellWidth + padding);
            const y = padding + row * (cellHeight + padding);
            const isActive = zone.id === activeZoneId;
            return (
              <Rect
                key={zone.id}
                x={x}
                y={y}
                width={cellWidth}
                height={cellHeight}
                rx={8}
                fill={isActive ? colors.primary : colors.surface}
                onPress={() => onSelectZone(zone.id)}
              />
            );
          })}
          {zones.map((zone, index) => {
            const row = Math.floor(index / columns);
            const col = index % columns;
            const x = padding + col * (cellWidth + padding);
            const y = padding + row * (cellHeight + padding);
            const labelX = x + cellWidth / 2;
            const labelY = y + cellHeight / 2 + 4;
            const isActive = zone.id === activeZoneId;
            return (
              <SvgText
                key={`label-${zone.id}`}
                x={labelX}
                y={labelY}
                fill={isActive ? colors.onPrimary : colors.text}
                fontSize="12"
                fontWeight="600"
                textAnchor="middle"
              >
                {zone.name}
              </SvgText>
            );
          })}
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    alignItems: 'center',
  },
  meta: {
    color: colors.textMuted,
  },
  panel: {
    flex: 1,
    gap: 12,
    paddingTop: 6,
  },
});
