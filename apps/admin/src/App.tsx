import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  Heading,
  HStack,
  Input,
  Select,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react';
import { createClient } from '@supabase/supabase-js';

type PackTable<T> = {
  upserts: T[];
  deletes: Array<number | string>;
};

type Pack = {
  version: string;
  stores: PackTable<{ id: number; name: string }>;
  zones: PackTable<{ id: number; store_id: number; name: string }>;
  products: PackTable<{ id: number; name: string; category: string | null }>;
  product_locations: PackTable<{
    product_id: number;
    store_id: number;
    zone_id: number | null;
    confidence: number | null;
  }>;
};

type UserRole = { key: string; store_id: number | null; scope: string };

type UserRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  roles: UserRole[];
};

type TabKey = 'overview' | 'stores' | 'zones' | 'products' | 'locations' | 'users';

type NavItem = { key: TabKey; label: string; description: string };

const DEFAULT_API_BASE = 'http://127.0.0.1:3001';
const PRESET_APIS = {
  local: 'http://127.0.0.1:3001',
  render: 'https://speedy-basket.onrender.com',
};
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

const navItems: NavItem[] = [
  {
    key: 'overview',
    label: 'Resumen',
    description: 'Estado general y conteos.',
  },
  {
    key: 'stores',
    label: 'Tiendas',
    description: 'Listado completo de tiendas.',
  },
  {
    key: 'zones',
    label: 'Zonas',
    description: 'Zonas asociadas al store activo.',
  },
  {
    key: 'products',
    label: 'Productos',
    description: 'Catalogo disponible por busqueda.',
  },
  {
    key: 'locations',
    label: 'Ubicaciones',
    description: 'Relaciones producto-zona.',
  },
  {
    key: 'users',
    label: 'Usuarios',
    description: 'Roles y accesos asignados.',
  },
];

function readStored(key: string, fallback: string) {
  if (typeof window === 'undefined') return fallback;
  return window.localStorage.getItem(key) ?? fallback;
}

export default function App() {
  const [apiBase, setApiBase] = useState(() => readStored('sb_admin_api', DEFAULT_API_BASE));
  const [storeId, setStoreId] = useState(() => readStored('sb_admin_store', '1'));
  const [authToken, setAuthToken] = useState(() => readStored('sb_admin_token', ''));
  const [authStatus, setAuthStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [authError, setAuthError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [stores, setStores] = useState<Array<{ id: number; name: string }>>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersStatus, setUsersStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [usersError, setUsersError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [pack, setPack] = useState<Pack | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const hasToken = authToken.trim().length > 0;

  const counts = useMemo(() => {
    if (!pack) return null;
    return {
      stores: pack.stores.upserts.length,
      zones: pack.zones.upserts.length,
      products: pack.products.upserts.length,
      locations: pack.product_locations.upserts.length,
    };
  }, [pack]);

  const parsedStoreId = Number(storeId);
  const filteredZones = useMemo(() => {
    if (!pack || !parsedStoreId) return [];
    return pack.zones.upserts.filter((zone) => zone.store_id === parsedStoreId);
  }, [pack, parsedStoreId]);

  const filteredLocations = useMemo(() => {
    if (!pack || !parsedStoreId) return [];
    return pack.product_locations.upserts.filter((row) => row.store_id === parsedStoreId);
  }, [pack, parsedStoreId]);

  const filteredProducts = useMemo(() => {
    if (!pack) return [];
    const term = search.trim().toLowerCase();
    if (!term) return pack.products.upserts;
    return pack.products.upserts.filter((product) => product.name.toLowerCase().includes(term));
  }, [pack, search]);

  useEffect(() => {
    window.localStorage.setItem('sb_admin_api', apiBase);
  }, [apiBase]);

  useEffect(() => {
    window.localStorage.setItem('sb_admin_store', storeId);
  }, [storeId]);

  useEffect(() => {
    window.localStorage.setItem('sb_admin_token', authToken);
  }, [authToken]);

  useEffect(() => {
    let active = true;
    const loadSession = async () => {
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        if (!active) return;
        setAuthError('Falta configurar Supabase.');
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setAuthToken(data.session?.access_token ?? '');
    };
    loadSession();
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setAuthToken(session?.access_token ?? '');
    });
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const handleLogin = useCallback(async () => {
    setAuthStatus('loading');
    setAuthError(null);
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      setAuthStatus('error');
      setAuthError('Falta configurar Supabase.');
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setAuthStatus('error');
      setAuthError(error.message);
      return;
    }
    setAuthStatus('idle');
  }, [email, password]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    setAuthToken('');
    setAuthStatus('idle');
    setAuthError(null);
    setEmail('');
    setPassword('');
  }, []);

  const authHeaders = useMemo(() => {
    if (!authToken.trim()) return {};
    return { Authorization: `Bearer ${authToken.trim()}` };
  }, [authToken]);

  useEffect(() => {
    let active = true;
    const loadStores = async () => {
      try {
        if (!hasToken) {
          setStores([]);
          setError('Auth token requerido.');
          return;
        }
        const res = await fetch(`${apiBase}/admin/stores`, { headers: authHeaders });
        if (!res.ok) {
          throw new Error(`Failed to load stores (${res.status})`);
        }
        const data = (await res.json()) as Array<{ id: number; name: string }>;
        if (!active) return;
        setStores(data);
        if (data.length > 0 && !data.some((store) => `${store.id}` === storeId)) {
          setStoreId(`${data[0].id}`);
        }
      } catch (err) {
        if (!active) return;
        setStores([]);
      }
    };
    loadStores();
    return () => {
      active = false;
    };
  }, [apiBase, authHeaders, hasToken, storeId, refreshTick]);

  useEffect(() => {
    let active = true;
    const loadUsers = async () => {
      try {
        if (!hasToken) {
          setUsers([]);
          setUsersStatus('error');
          setUsersError('Auth token requerido.');
          return;
        }
        setUsersStatus('loading');
        setUsersError(null);
        const res = await fetch(`${apiBase}/admin/users`, { headers: authHeaders });
        if (!res.ok) {
          throw new Error(`Failed to load users (${res.status})`);
        }
        const data = (await res.json()) as UserRow[];
        if (!active) return;
        setUsers(data);
        setUsersStatus('idle');
      } catch (err) {
        if (!active) return;
        setUsers([]);
        setUsersStatus('error');
        setUsersError(err instanceof Error ? err.message : 'Unknown error');
      }
    };
    loadUsers();
    return () => {
      active = false;
    };
  }, [apiBase, authHeaders, hasToken, refreshTick]);

  const handleLoad = useCallback(async () => {
    if (!storeId) return;
    if (!hasToken) {
      setStatus('error');
      setError('Auth token requerido.');
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      const res = await fetch(`${apiBase}/admin/pack?storeId=${encodeURIComponent(storeId)}`, {
        headers: authHeaders,
      });
      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`);
      }
      const data = (await res.json()) as Pack;
      setPack(data);
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [apiBase, authHeaders, hasToken, storeId]);

  const handleRefresh = useCallback(() => {
    setRefreshTick((prev) => prev + 1);
    handleLoad();
  }, [handleLoad]);

  useEffect(() => {
    if (!storeId) return;
    handleLoad();
  }, [handleLoad, storeId]);

  if (!hasToken) {
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
                    onChange={(event) => setEmail(event.target.value)}
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
                    onChange={(event) => setPassword(event.target.value)}
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
                  onClick={handleLogin}
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

        <VStack align="stretch" spacing={2}>
          {navItems.map((item) => (
            <Button
              key={item.key}
              justifyContent="flex-start"
              variant="ghost"
              bg={activeTab === item.key ? 'rgba(248,178,106,0.18)' : 'transparent'}
              border={activeTab === item.key ? '1px solid rgba(248,178,106,0.4)' : '1px solid transparent'}
              color={activeTab === item.key ? '#ffd7ad' : '#cbd5f5'}
              fontWeight={600}
              onClick={() => setActiveTab(item.key)}
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

        <Divider borderColor="rgba(255,255,255,0.08)" />

        <VStack align="stretch" spacing={4}>
          <Box>
            <Text fontSize="xs" color="#9aa6bf">
              API base
            </Text>
            <Input
              mt={2}
              value={apiBase}
              onChange={(event) => setApiBase(event.target.value)}
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
                onClick={() => setApiBase(PRESET_APIS.local)}
              >
                Local
              </Button>
              <Button
                size="xs"
                variant="outline"
                borderColor="rgba(255,255,255,0.2)"
                onClick={() => setApiBase(PRESET_APIS.render)}
              >
                Render
              </Button>
            </HStack>
          </Box>

          <Box>
            <Text fontSize="xs" color="#9aa6bf">
              Store activo
            </Text>
            {stores.length > 0 ? (
              <Select
                mt={2}
                value={storeId}
                onChange={(event) => setStoreId(event.target.value)}
                bg="rgba(15,18,26,0.8)"
                borderColor="rgba(255,255,255,0.12)"
                fontSize="sm"
                color="#eef1ff"
              >
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name} (#{store.id})
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                mt={2}
                type="number"
                min="1"
                value={storeId}
                onChange={(event) => setStoreId(event.target.value)}
                bg="rgba(15,18,26,0.8)"
                borderColor="rgba(255,255,255,0.12)"
                fontSize="sm"
                color="#eef1ff"
                _placeholder={{ color: '#64748b' }}
              />
            )}
          </Box>

          <Button onClick={handleLogout} variant="outline" borderColor="rgba(255,255,255,0.2)">
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
        <Flex justify="space-between" align="center">
          <Box>
            <Heading size="lg">Panel de control</Heading>
            <Text color="#94a3b8" fontSize="sm" mt={1}>
              Store activo: {storeId || 'N/A'} · API {apiBase}
            </Text>
          </Box>
          <Button
            onClick={handleRefresh}
            bg="#f8b26a"
            color="#1f232b"
            _hover={{ bg: '#ffd2a1' }}
          >
            {status === 'loading' ? 'Cargando...' : 'Refrescar'}
          </Button>
        </Flex>

        {error ? (
          <Box bg="rgba(239,68,68,0.12)" border="1px solid rgba(239,68,68,0.35)" p={4} borderRadius="16px">
            <Text color="#fca5a5">{error}</Text>
          </Box>
        ) : null}

        {activeTab === 'overview' && (
          <Stack spacing={6}>
            <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4}>
              <StatCard label="Version" value={pack?.version ?? 'Sin pack'} accent />
              <StatCard label="Tiendas" value={counts?.stores ?? 0} />
              <StatCard label="Zonas" value={counts?.zones ?? 0} />
              <StatCard label="Productos" value={counts?.products ?? 0} />
              <StatCard label="Ubicaciones" value={counts?.locations ?? 0} />
              <StatCard label="Usuarios" value={users.length} />
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
                  Estado de usuarios
                </Text>
                <Text mt={3} fontSize="sm" color="#cbd5f5">
                  {users.length} usuarios registrados · {users.filter((u) => u.roles.length > 0).length} con roles.
                </Text>
                <Text mt={2} fontSize="xs" color="#94a3b8">
                  Ultima sincronizacion: {pack?.version ?? 'sin pack'}
                </Text>
              </Box>
            </SimpleGrid>
          </Stack>
        )}

        {activeTab === 'stores' && (
          <SectionCard title="Tiendas">
            {pack?.stores.upserts.map((store) => (
              <RowItem key={store.id} title={store.name} meta={`#${store.id}`} />
            ))}
            {pack && pack.stores.upserts.length === 0 && (
              <Text color="#94a3b8">Sin tiendas.</Text>
            )}
            {!pack && <EmptyState />}
          </SectionCard>
        )}

        {activeTab === 'zones' && (
          <SectionCard title="Zonas">
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
          <SectionCard title="Productos">
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
                  title={product.name}
                  meta={`#${product.id}${product.category ? ` · ${product.category}` : ''}`}
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
          <SectionCard title="Ubicaciones">
            {filteredLocations.map((location) => (
              <RowItem
                key={`${location.product_id}-${location.store_id}`}
                title={`Producto ${location.product_id}`}
                meta={`store ${location.store_id} · zone ${location.zone_id ?? '-'} · conf ${
                  location.confidence ?? '-'
                }`}
              />
            ))}
            {pack && filteredLocations.length === 0 && (
              <Text color="#94a3b8">Sin ubicaciones.</Text>
            )}
            {!pack && <EmptyState />}
          </SectionCard>
        )}

        {activeTab === 'users' && (
          <SectionCard title="Usuarios">
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

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
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

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box
      bg="rgba(255,255,255,0.04)"
      border="1px solid rgba(255,255,255,0.08)"
      borderRadius="24px"
      p={6}
    >
      <Heading size="md" mb={4}>
        {title}
      </Heading>
      <VStack align="stretch" spacing={3}>
        {children}
      </VStack>
    </Box>
  );
}

function RowItem({ title, meta }: { title: string; meta: string }) {
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

function EmptyState() {
  return <Text color="#94a3b8">Carga un pack para ver el detalle.</Text>;
}
