import { useEffect, useState } from 'react';
import type { UserRow } from '../domain/types';

export function useAdminUsers(params: {
  apiBase: string;
  authHeaders: Record<string, string>;
  hasToken: boolean;
  refreshKey: number;
}) {
  const { apiBase, authHeaders, hasToken, refreshKey } = params;
  const [users, setUsers] = useState<UserRow[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadUsers = async () => {
      try {
        if (!hasToken) {
          setUsers([]);
          setStatus('error');
          setError('Auth token requerido.');
          return;
        }
        setStatus('loading');
        setError(null);
        const res = await fetch(`${apiBase}/admin/users`, { headers: authHeaders });
        if (!res.ok) {
          throw new Error(`Failed to load users (${res.status})`);
        }
        const data = (await res.json()) as UserRow[];
        if (!active) return;
        setUsers(data);
        setStatus('idle');
      } catch (err) {
        if (!active) return;
        setUsers([]);
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };
    loadUsers();
    return () => {
      active = false;
    };
  }, [apiBase, authHeaders, hasToken, refreshKey]);

  return { users, status, error };
}
