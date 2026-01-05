import { useCallback, useEffect, useState } from 'react';
import { supabase, supabaseEnvOk } from '../infrastructure/supabaseClient';

export function useAuthSession() {
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadSession = async () => {
      if (!supabaseEnvOk) {
        if (!active) return;
        setError('Falta configurar Supabase.');
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setToken(data.session?.access_token ?? '');
    };
    loadSession();
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setToken(session?.access_token ?? '');
    });
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setStatus('loading');
    setError(null);
    if (!supabaseEnvOk) {
      setStatus('error');
      setError('Falta configurar Supabase.');
      return;
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) {
      setStatus('error');
      setError(signInError.message);
      return;
    }
    setStatus('idle');
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setToken('');
    setStatus('idle');
    setError(null);
  }, []);

  return {
    token,
    hasToken: token.trim().length > 0,
    status,
    error,
    signIn,
    signOut,
  };
}
