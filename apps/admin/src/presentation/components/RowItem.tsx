import { Flex, Text } from '@chakra-ui/react';

export function RowItem({ title, meta }: { title: string; meta: string }) {
  return (
    <Flex
      justify="space-between"
      align={{ base: 'flex-start', md: 'center' }}
      direction={{ base: 'column', md: 'row' }}
      gap={2}
      bg="rgba(255,255,255,0.04)"
      border="1px solid rgba(255,255,255,0.08)"
      borderRadius="16px"
      px={4}
      py={3}
    >
      <Text fontWeight="600">{title}</Text>
      <Text fontSize="sm" color="#94a3b8">
        {meta}
      </Text>
    </Flex>
  );
}
