import { Badge, Box, Button, Divider, Flex, Heading, HStack, Input, Select, SimpleGrid, Spinner, Stack, Text, VStack } from '@chakra-ui/react';
import { useMemo, useState } from 'react';
import type { NavItem, Pack, TabKey, UserRow } from '../../domain/types';
import { EmptyState } from '../components/EmptyState';
import { RowItem } from '../components/RowItem';
import { SectionCard } from '../components/SectionCard';
import { StatCard } from '../components/StatCard';
import { SidebarNav } from '../layout/SidebarNav';

const storeNavItems: NavItem[] = [
  {
    key: 'store',
    label: 'Panel de tienda',
    description: 'Resumen del store activo.',
  },
  {
    key: 'zones',
    label: 'Zonas',
    description: 'Zonas asociadas al store activo.',
  },
  {
    key: 'locations',
    label: 'Ubicaciones',
    description: 'Relaciones producto-zona.',
  },
];

const globalNavItems: NavItem[] = [
  {
    key: 'products',
    label: 'Productos',
    description: 'Catalogo global para todas las tiendas.',
  },
  {
    key: 'users',
    label: 'Usuarios',
    description: 'Roles y accesos asignados.',
  },
];

export function AdminDashboard({
  apiBase,
  storeId,
  stores,
  pack,
  packStatus,
  packError,
  users,
  usersStatus,
  usersError,
  onApiBaseChange,
  onStoreChange,
  onRefresh,
  onLogout,
  presetApis,
}: {
  apiBase: string;
  storeId: string;
  stores: Array<{ id: number; name: string }>;
  pack: Pack | null;
  packStatus: 'idle' | 'loading' | 'error';
  packError: string | null;
  users: UserRow[];
  usersStatus: 'idle' | 'loading' | 'error';
  usersError: string | null;
  onApiBaseChange: (value: string) => void;
  onStoreChange: (value: string) => void;
  onRefresh: () => void;
  onLogout: () => void;
  presetApis: { local: string; render: string };
}) {
  const [activeTab, setActiveTab] = useState<TabKey>('store');
  const [search, setSearch] = useState('');
  const isStoreScope = activeTab === 'store' || activeTab === 'zones' || activeTab === 'locations';
  const parsedStoreId = Number(storeId);
  const filteredZones = useMemo(() => {
    if (!pack || !parsedStoreId) return [];
    return pack.zones.upserts.filter((zone) => zone.store_id === parsedStoreId);
  }, [pack, parsedStoreId]);

  const zoneNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const zone of filteredZones) {
      map.set(zone.id, zone.name);
    }
    return map;
  }, [filteredZones]);

  const productZoneById = useMemo(() => {
    if (!pack || !parsedStoreId) return new Map<number, string>();
    const map = new Map<number, string>();
    for (const location of pack.product_locations.upserts) {
      if (location.store_id !== parsedStoreId) continue;
      const zoneLabel = location.zone_id ? zoneNameById.get(location.zone_id) : null;
      if (zoneLabel) {
        map.set(location.product_id, zoneLabel);
      }
    }
    return map;
  }, [pack, parsedStoreId, zoneNameById]);

  const filteredLocations = useMemo(() => {
    if (!pack || !parsedStoreId) return [];
    return pack.product_locations.upserts.filter((row) => row.store_id === parsedStoreId);
  }, [pack, parsedStoreId]);

  const productNames = useMemo(() => {
    if (!pack) return new Map<number, string>();
    const names = new Map<number, string>();
    for (const translation of pack.product_translations.upserts) {
      if (translation.locale === 'es') {
        names.set(translation.product_id, translation.name);
      }
    }
    return names;
  }, [pack]);

  const productNamesEn = useMemo(() => {
    if (!pack) return new Map<number, string>();
    const names = new Map<number, string>();
    for (const translation of pack.product_translations.upserts) {
      if (translation.locale === 'en') {
        names.set(translation.product_id, translation.name);
      }
    }
    return names;
  }, [pack]);

  const formatProductLabel = useMemo(() => {
    return (productId: number, fallbackName: string) => {
      const esName = productNames.get(productId) ?? fallbackName;
      const enName = productNamesEn.get(productId) ?? '-';
      return `${esName} / ${enName}`;
    };
  }, [productNames, productNamesEn]);

  const filteredProducts = useMemo(() => {
    if (!pack) return [];
    const term = search.trim().toLowerCase();
    if (!term) return pack.products.upserts;
    return pack.products.upserts.filter((product) => {
      const displayName = formatProductLabel(product.id, product.name);
      return displayName.toLowerCase().includes(term);
    });
  }, [pack, formatProductLabel, search]);

  const counts = useMemo(() => {
    if (!pack) return null;
    return {
      products: pack.products.upserts.length,
    };
  }, [pack]);

  const activeStoreName = useMemo(() => {
    if (!parsedStoreId) return 'Sin store';
    return stores.find((store) => store.id === parsedStoreId)?.name ?? `Store #${storeId}`;
  }, [parsedStoreId, storeId, stores]);

  return (
    <Flex minH="100vh" bg="#0f1117" color="#eef1ff" p={6} gap={6}>
      <Box
        w="280px"
        bg="rgba(255,255,255,0.05)"
        border="1px solid rgba(255,255,255,0.08)"
        borderRadius="24px"
        p={5}
        position="sticky"
        top={6}
        height="calc(100vh - 48px)"
        display="flex"
        flexDirection="column"
        gap={5}
      >
        <Box>
          <Text fontSize="xs" letterSpacing="0.2em" color="#94a3b8">
            SPEEDY BASKET
          </Text>
          <Heading size="md" mt={2}>
            Admin Deck
          </Heading>
          <Text fontSize="sm" color="#9aa6bf" mt={1}>
            Ruta rapida a los datos que mandan.
          </Text>
        </Box>

        <VStack align="stretch" spacing={3}>
          <SidebarNav title="POR TIENDA" items={storeNavItems} activeTab={activeTab} onChange={setActiveTab} />
          <SidebarNav title="GLOBAL" items={globalNavItems} activeTab={activeTab} onChange={setActiveTab} />
        </VStack>

        <Divider borderColor="rgba(255,255,255,0.08)" />

        <VStack align="stretch" spacing={4}>
          <Box>
            <Text fontSize="xs" color="#9aa6bf">
              API base
            </Text>
            <Input
              mt={2}
              value={apiBase}
              onChange={(event) => onApiBaseChange(event.target.value)}
              bg="rgba(15,18,26,0.8)"
              borderColor="rgba(255,255,255,0.12)"
              fontSize="sm"
              color="#eef1ff"
              _placeholder={{ color: '#64748b' }}
            />
            <HStack spacing={2} mt={2}>
              <Button
                size="xs"
                variant="outline"
                borderColor="rgba(255,255,255,0.2)"
                color="#e2e8f0"
                onClick={() => onApiBaseChange(presetApis.local)}
              >
                Local
              </Button>
              <Button
                size="xs"
                variant="outline"
                borderColor="rgba(255,255,255,0.2)"
                color="#e2e8f0"
                onClick={() => onApiBaseChange(presetApis.render)}
              >
                Render
              </Button>
            </HStack>
          </Box>

          <Box>
            <Text fontSize="xs" color="#9aa6bf">
              Store activo
            </Text>
            <Text fontSize="sm" color="#cbd5f5" mt={2}>
              {activeStoreName} · #{storeId}
            </Text>
            <Text fontSize="xs" color="#64748b" mt={1}>
              Cambia la tienda desde la cabecera.
            </Text>
          </Box>

          <Button
            onClick={onLogout}
            variant="outline"
            borderColor="rgba(255,255,255,0.2)"
            color="#e2e8f0"
          >
            Cerrar sesion
          </Button>
        </VStack>

        <Box mt="auto" bg="rgba(255,255,255,0.06)" borderRadius="16px" p={3}>
          <HStack spacing={2}>
            <Box w="10px" h="10px" bg="#34d399" borderRadius="full" />
            <Text fontSize="xs" color="#cbd5f5">
              Sesion activa
            </Text>
          </HStack>
          <Text fontSize="xs" color="#94a3b8" mt={1}>
            {stores.length} stores detectados
          </Text>
        </Box>
      </Box>

      <Flex flex="1" direction="column" gap={6}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
          <Box>
            <Heading size="lg">{isStoreScope ? activeStoreName : 'Panel global'}</Heading>
            <Text color="#94a3b8" fontSize="sm" mt={1}>
              {isStoreScope
                ? `Store activo: #${storeId || 'N/A'} · API ${apiBase}`
                : `Datos globales · Store seleccionado: #${storeId || 'N/A'} · API ${apiBase}`}
            </Text>
          </Box>
          <HStack spacing={3} flexWrap="wrap" justify="flex-end">
            <Select
              value={storeId}
              onChange={(event) => onStoreChange(event.target.value)}
              bg="rgba(15,18,26,0.8)"
              borderColor="rgba(255,255,255,0.12)"
              color="#eef1ff"
              fontSize="sm"
              minW="220px"
            >
              {stores.length === 0 && <option value={storeId}>#{storeId}</option>}
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name} (#{store.id})
                </option>
              ))}
            </Select>
            <Button
              onClick={onRefresh}
              bg="#f8b26a"
              color="#1f232b"
              _hover={{ bg: '#ffd2a1' }}
            >
              {packStatus === 'loading' ? 'Cargando...' : 'Refrescar'}
            </Button>
          </HStack>
        </Flex>

        {packError ? (
          <Box
            bg="rgba(239,68,68,0.12)"
            border="1px solid rgba(239,68,68,0.35)"
            p={4}
            borderRadius="16px"
          >
            <Text color="#fca5a5">{packError}</Text>
          </Box>
        ) : null}

        {activeTab === 'store' && (
          <Stack spacing={6}>
            <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4}>
              <StatCard label="Version pack" value={pack?.version ?? 'Sin pack'} accent />
              <StatCard label="Zonas" value={filteredZones.length} />
              <StatCard label="Ubicaciones" value={filteredLocations.length} />
              <StatCard label="Productos (pack)" value={counts?.products ?? 0} />
            </SimpleGrid>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <Box
                bg="rgba(255,255,255,0.05)"
                border="1px solid rgba(255,255,255,0.08)"
                borderRadius="18px"
                p={4}
              >
                <Text fontSize="sm" color="#9aa6bf">
                  Stores disponibles
                </Text>
                <VStack align="stretch" mt={3} spacing={2}>
                  {stores.length === 0 && (
                    <Text fontSize="sm" color="#94a3b8">
                      Sin stores.
                    </Text>
                  )}
                  {stores.map((store) => (
                    <HStack key={store.id} justify="space-between">
                      <Text>{store.name}</Text>
                      <Badge colorScheme="orange">#{store.id}</Badge>
                    </HStack>
                  ))}
                </VStack>
              </Box>
              <Box
                bg="rgba(255,255,255,0.05)"
                border="1px solid rgba(255,255,255,0.08)"
                borderRadius="18px"
                p={4}
              >
                <Text fontSize="sm" color="#9aa6bf">
                  Resumen tienda
                </Text>
                <Text mt={3} fontSize="sm" color="#cbd5f5">
                  {filteredZones.length} zonas activas · {filteredLocations.length} ubicaciones
                </Text>
                <Text mt={2} fontSize="xs" color="#94a3b8">
                  Ultima sincronizacion: {pack?.version ?? 'sin pack'}
                </Text>
              </Box>
            </SimpleGrid>
          </Stack>
        )}

        {activeTab === 'zones' && (
          <SectionCard title="Zonas" description="Datos ligados al store activo.">
            {filteredZones.map((zone) => (
              <RowItem key={zone.id} title={zone.name} meta={`#${zone.id} · store ${zone.store_id}`} />
            ))}
            {pack && filteredZones.length === 0 && (
              <Text color="#94a3b8">Sin zonas para este store.</Text>
            )}
            {!pack && <EmptyState />}
          </SectionCard>
        )}

        {activeTab === 'products' && (
          <SectionCard title="Productos" description="Catalogo global (no depende de la tienda).">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar producto"
              bg="rgba(15,18,26,0.8)"
              borderColor="rgba(255,255,255,0.12)"
              color="#eef1ff"
              _placeholder={{ color: '#64748b' }}
            />
            <VStack align="stretch" spacing={3} mt={4}>
              {filteredProducts.map((product) => (
                <RowItem
                  key={product.id}
                  title={formatProductLabel(product.id, product.name)}
                  meta={`#${product.id}${
                    product.category ? ` · ${product.category}` : ''
                  } · zona ${productZoneById.get(product.id) ?? 'sin zona'}`}
                />
              ))}
              {pack && filteredProducts.length === 0 && (
                <Text color="#94a3b8">Sin productos.</Text>
              )}
              {!pack && <EmptyState />}
            </VStack>
          </SectionCard>
        )}

        {activeTab === 'locations' && (
          <SectionCard title="Ubicaciones" description="Ubicaciones por tienda seleccionada.">
            {filteredLocations.map((location) => (
              <RowItem
                key={`${location.product_id}-${location.store_id}`}
                title={formatProductLabel(location.product_id, `Producto ${location.product_id}`)}
                meta={`zona ${
                  location.zone_id ? zoneNameById.get(location.zone_id) ?? location.zone_id : '-'
                } · conf ${location.confidence ?? '-'}`}
              />
            ))}
            {pack && filteredLocations.length === 0 && (
              <Text color="#94a3b8">Sin ubicaciones.</Text>
            )}
            {!pack && <EmptyState />}
          </SectionCard>
        )}

        {activeTab === 'users' && (
          <SectionCard title="Usuarios" description="Usuarios globales con roles.">
            {usersStatus === 'loading' && (
              <HStack spacing={3} color="#94a3b8">
                <Spinner size="sm" />
                <Text>Cargando usuarios...</Text>
              </HStack>
            )}
            {usersStatus === 'error' && usersError && <Text color="#fca5a5">{usersError}</Text>}
            {usersStatus === 'idle' && users.length === 0 && (
              <Text color="#94a3b8">Sin usuarios.</Text>
            )}
            <VStack align="stretch" spacing={4} mt={2}>
              {users.map((user) => (
                <Flex
                  key={user.id}
                  direction={{ base: 'column', md: 'row' }}
                  justify="space-between"
                  gap={3}
                  bg="rgba(255,255,255,0.04)"
                  border="1px solid rgba(255,255,255,0.08)"
                  borderRadius="16px"
                  p={4}
                >
                  <Box>
                    <Text fontWeight="600">{user.display_name?.trim() || 'Sin nombre'}</Text>
                    <Text fontSize="sm" color="#94a3b8">
                      {user.email ?? 'Sin email'}
                    </Text>
                    <Text fontSize="xs" color="#6b7280" mt={1}>
                      {user.id}
                    </Text>
                  </Box>
                  <HStack flexWrap="wrap" justify={{ base: 'flex-start', md: 'flex-end' }}>
                    {user.roles.length === 0 && (
                      <Badge colorScheme="gray" variant="subtle">
                        Sin roles
                      </Badge>
                    )}
                    {user.roles.map((role) => (
                      <Badge
                        key={`${user.id}-${role.key}-${role.store_id ?? 'global'}`}
                        colorScheme={role.key === 'admin_god' ? 'orange' : 'blue'}
                        variant="solid"
                      >
                        {role.key}
                        {role.store_id ? ` · tienda ${role.store_id}` : ''}
                      </Badge>
                    ))}
                  </HStack>
                </Flex>
              ))}
            </VStack>
          </SectionCard>
        )}
      </Flex>
    </Flex>
  );
}
