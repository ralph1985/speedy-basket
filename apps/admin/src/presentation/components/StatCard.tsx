import { Box, Text } from '@chakra-ui/react';

export function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <Box
      bg={accent ? 'rgba(248,178,106,0.16)' : 'rgba(255,255,255,0.05)'}
      border="1px solid rgba(255,255,255,0.08)"
      borderRadius="18px"
      p={4}
    >
      <Text fontSize="xs" color="#9aa6bf" textTransform="uppercase" letterSpacing="0.2em">
        {label}
      </Text>
      <Text fontSize="2xl" fontWeight="700" mt={2}>
        {value}
      </Text>
    </Box>
  );
}
