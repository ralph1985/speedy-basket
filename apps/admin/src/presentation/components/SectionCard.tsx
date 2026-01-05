import { Box, Heading, Text, VStack } from '@chakra-ui/react';

export function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      bg="rgba(255,255,255,0.04)"
      border="1px solid rgba(255,255,255,0.08)"
      borderRadius="24px"
      p={6}
    >
      <Box mb={4}>
        <Heading size="md">{title}</Heading>
        {description ? (
          <Text fontSize="sm" color="#94a3b8" mt={1}>
            {description}
          </Text>
        ) : null}
      </Box>
      <VStack align="stretch" spacing={3}>
        {children}
      </VStack>
    </Box>
  );
}
