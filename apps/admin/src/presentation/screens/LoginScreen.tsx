import { Box, Button, Divider, Flex, Heading, Input, Stack, Text, VStack } from '@chakra-ui/react';

export function LoginScreen({
  email,
  password,
  authError,
  authStatus,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: {
  email: string;
  password: string;
  authError: string | null;
  authStatus: 'idle' | 'loading' | 'error';
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <Flex minH="100vh" bg="radial-gradient(circle at top, #2b3446, #0f1117)" p={6}>
      <Flex flex="1" align="center" justify="center">
        <Box
          w="full"
          maxW="420px"
          bg="rgba(255,255,255,0.06)"
          border="1px solid rgba(255,255,255,0.12)"
          borderRadius="24px"
          p={8}
          color="#f5f5f5"
          boxShadow="0 24px 60px rgba(0,0,0,0.35)"
        >
          <VStack align="stretch" spacing={5}>
            <Box>
              <Text fontSize="sm" letterSpacing="0.18em" color="#9aa6bf">
                SPEEDY BASKET
              </Text>
              <Heading size="lg" mt={2}>
                Control de la fuente de la verdad
              </Heading>
              <Text mt={2} color="#cbd5f5">
                Accede con tu cuenta para revisar tiendas, packs y usuarios.
              </Text>
            </Box>
            <Divider borderColor="rgba(255,255,255,0.1)" />
            <Stack spacing={4}>
              <Box>
                <Text fontSize="sm" color="#9aa6bf">
                  Email
                </Text>
                <Input
                  mt={2}
                  value={email}
                  onChange={(event) => onEmailChange(event.target.value)}
                  placeholder="tu@email.com"
                  bg="rgba(15,18,26,0.8)"
                  borderColor="rgba(255,255,255,0.12)"
                  color="#eef1ff"
                  _placeholder={{ color: '#64748b' }}
                />
              </Box>
              <Box>
                <Text fontSize="sm" color="#9aa6bf">
                  Password
                </Text>
                <Input
                  mt={2}
                  type="password"
                  value={password}
                  onChange={(event) => onPasswordChange(event.target.value)}
                  bg="rgba(15,18,26,0.8)"
                  borderColor="rgba(255,255,255,0.12)"
                  color="#eef1ff"
                  _placeholder={{ color: '#64748b' }}
                />
              </Box>
              {authError ? (
                <Text color="#fca5a5" fontSize="sm">
                  {authError}
                </Text>
              ) : null}
              <Button
                onClick={onSubmit}
                isDisabled={authStatus === 'loading'}
                bg="#f8b26a"
                color="#1f232b"
                _hover={{ bg: '#ffd2a1' }}
              >
                {authStatus === 'loading' ? 'Entrando...' : 'Entrar'}
              </Button>
            </Stack>
          </VStack>
        </Box>
      </Flex>
    </Flex>
  );
}
