import { Box, Button, Text, VStack } from '@chakra-ui/react';
import type { NavItem, TabKey } from '../../domain/types';

export function SidebarNav({
  title,
  items,
  activeTab,
  onChange,
}: {
  title: string;
  items: NavItem[];
  activeTab: TabKey;
  onChange: (key: TabKey) => void;
}) {
  return (
    <Box>
      <Text fontSize="xs" letterSpacing="0.2em" color="#64748b">
        {title}
      </Text>
      <VStack align="stretch" spacing={2} mt={2}>
        {items.map((item) => (
          <Button
            key={item.key}
            justifyContent="flex-start"
            variant="ghost"
            bg={activeTab === item.key ? 'rgba(248,178,106,0.18)' : 'transparent'}
            border={
              activeTab === item.key
                ? '1px solid rgba(248,178,106,0.4)'
                : '1px solid transparent'
            }
            color={activeTab === item.key ? '#ffd7ad' : '#cbd5f5'}
            fontWeight={600}
            onClick={() => onChange(item.key)}
            _hover={{ bg: 'rgba(248,178,106,0.12)' }}
          >
            <Box textAlign="left">
              <Text fontSize="sm">{item.label}</Text>
              <Text fontSize="xs" color="#9aa6bf">
                {item.description}
              </Text>
            </Box>
          </Button>
        ))}
      </VStack>
    </Box>
  );
}
