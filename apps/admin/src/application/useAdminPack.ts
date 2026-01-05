import { useCallback, useEffect, useState } from 'react';
import type { Pack } from '../domain/types';

export function useAdminPack(params: {
  apiBase: string;
  authHeaders: Record<string, string>;
  hasToken: boolean;
  storeId: string;
}) {
  const { apiBase, authHeaders, hasToken, storeId } = params;
  const [pack, setPack] = useState<Pack | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const loadPack = useCallback(async () => {
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

  useEffect(() => {
    if (!storeId) return;
    loadPack();
  }, [loadPack, storeId]);

  return { pack, status, error, refresh: loadPack };
}
