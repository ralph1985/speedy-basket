import { useEffect, useMemo, useState } from 'react';
import { useAdminPack } from './application/useAdminPack';
import { useAdminStores } from './application/useAdminStores';
import { useAdminUsers } from './application/useAdminUsers';
import { useAuthSession } from './application/useAuthSession';
import { readStored, writeStored } from './infrastructure/storage';
import { AdminDashboard } from './presentation/screens/AdminDashboard';
import { LoginScreen } from './presentation/screens/LoginScreen';

const DEFAULT_API_BASE = 'http://127.0.0.1:3001';
const PRESET_APIS = {
  local: 'http://127.0.0.1:3001',
  render: 'https://speedy-basket.onrender.com',
};

export default function App() {
  const [apiBase, setApiBase] = useState(() => readStored('sb_admin_api', DEFAULT_API_BASE));
  const [storeId, setStoreId] = useState(() => readStored('sb_admin_store', '1'));
  const [refreshKey, setRefreshKey] = useState(0);
  const { token, hasToken, status: authStatus, error: authError, signIn, signOut } =
    useAuthSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const authHeaders = useMemo(() => {
    if (!token.trim()) return {};
    return { Authorization: `Bearer ${token.trim()}` };
  }, [token]);

  const { stores } = useAdminStores({
    apiBase,
    authHeaders,
    hasToken,
    storeId,
    onStoreChange: setStoreId,
    refreshKey,
  });

  const { pack, status: packStatus, error: packError, refresh: refreshPack } = useAdminPack({
    apiBase,
    authHeaders,
    hasToken,
    storeId,
  });

  const { users, status: usersStatus, error: usersError } = useAdminUsers({
    apiBase,
    authHeaders,
    hasToken,
    refreshKey,
  });

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
    refreshPack();
  };

  const handleLogin = () => {
    signIn(email, password);
  };

  const handleLogout = () => {
    signOut();
    setEmail('');
    setPassword('');
  };

  const handleApiBaseChange = (value: string) => {
    setApiBase(value);
  };

  const handleStoreChange = (value: string) => {
    setStoreId(value);
  };

  useEffect(() => {
    writeStored('sb_admin_api', apiBase);
  }, [apiBase]);

  useEffect(() => {
    writeStored('sb_admin_store', storeId);
  }, [storeId]);

  useEffect(() => {
    writeStored('sb_admin_token', token);
  }, [token]);

  if (!hasToken) {
    return (
      <LoginScreen
        email={email}
        password={password}
        authStatus={authStatus}
        authError={authError}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onSubmit={handleLogin}
      />
    );
  }

  return (
    <AdminDashboard
      apiBase={apiBase}
      storeId={storeId}
      stores={stores}
      pack={pack}
      packStatus={packStatus}
      packError={packError}
      users={users}
      usersStatus={usersStatus}
      usersError={usersError}
      onApiBaseChange={handleApiBaseChange}
      onStoreChange={handleStoreChange}
      onRefresh={handleRefresh}
      onLogout={handleLogout}
      presetApis={PRESET_APIS}
    />
  );
}
