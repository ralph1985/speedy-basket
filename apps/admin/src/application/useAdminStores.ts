import { useEffect, useState } from 'react';

export function useAdminStores(params: {
  apiBase: string;
  authHeaders: Record<string, string>;
  hasToken: boolean;
  storeId: string;
  onStoreChange: (value: string) => void;
  refreshKey: number;
}) {
  const { apiBase, authHeaders, hasToken, storeId, onStoreChange, refreshKey } = params;
  const [stores, setStores] = useState<Array<{ id: number; name: string }>>([]);

  useEffect(() => {
    let active = true;
    const loadStores = async () => {
      try {
        if (!hasToken) {
          setStores([]);
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
          onStoreChange(`${data[0].id}`);
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
  }, [apiBase, authHeaders, hasToken, storeId, onStoreChange, refreshKey]);

  return { stores };
}
