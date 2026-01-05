import { useEffect, useMemo, useState } from 'react';

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

const DEFAULT_API_BASE = 'http://127.0.0.1:3001';

function readStored(key: string, fallback: string) {
  if (typeof window === 'undefined') return fallback;
  return window.localStorage.getItem(key) ?? fallback;
}

export default function App() {
  const [apiBase, setApiBase] = useState(() => readStored('sb_admin_api', DEFAULT_API_BASE));
  const [storeId, setStoreId] = useState(() => readStored('sb_admin_store', '1'));
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [pack, setPack] = useState<Pack | null>(null);

  const counts = useMemo(() => {
    if (!pack) return null;
    return {
      stores: pack.stores.upserts.length,
      zones: pack.zones.upserts.length,
      products: pack.products.upserts.length,
      locations: pack.product_locations.upserts.length,
    };
  }, [pack]);

  useEffect(() => {
    window.localStorage.setItem('sb_admin_api', apiBase);
  }, [apiBase]);

  useEffect(() => {
    window.localStorage.setItem('sb_admin_store', storeId);
  }, [storeId]);

  const handleLoad = async () => {
    setStatus('loading');
    setError(null);
    try {
      const res = await fetch(`${apiBase}/pack?storeId=${encodeURIComponent(storeId)}`);
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
  };

  return (
    <main className="container">
      <header className="header">
        <div>
          <h1>Speedy Basket Admin</h1>
          <p>Consulta rapida del estado de la BD via API.</p>
        </div>
        <button type="button" onClick={handleLoad} disabled={status === 'loading'}>
          {status === 'loading' ? 'Cargando...' : 'Cargar pack'}
        </button>
      </header>

      <section className="panel">
        <label>
          API base
          <input
            type="text"
            value={apiBase}
            onChange={(event) => setApiBase(event.target.value)}
          />
        </label>
        <label>
          Store ID
          <input
            type="number"
            min="1"
            value={storeId}
            onChange={(event) => setStoreId(event.target.value)}
          />
        </label>
        {status === 'error' && <p className="error">{error}</p>}
      </section>

      <section className="panel">
        <h2>Resumen</h2>
        {!pack && <p className="muted">Sin datos cargados.</p>}
        {pack && counts && (
          <div className="grid">
            <div className="card">
              <p className="label">Version</p>
              <p className="value">{pack.version}</p>
            </div>
            <div className="card">
              <p className="label">Stores</p>
              <p className="value">{counts.stores}</p>
            </div>
            <div className="card">
              <p className="label">Zones</p>
              <p className="value">{counts.zones}</p>
            </div>
            <div className="card">
              <p className="label">Products</p>
              <p className="value">{counts.products}</p>
            </div>
            <div className="card">
              <p className="label">Locations</p>
              <p className="value">{counts.locations}</p>
            </div>
          </div>
        )}
      </section>

      {pack && (
        <section className="grid two">
          <div className="panel">
            <h2>Stores</h2>
            <ul>
              {pack.stores.upserts.map((store) => (
                <li key={store.id}>
                  {store.id} - {store.name}
                </li>
              ))}
            </ul>
          </div>
          <div className="panel">
            <h2>Zones</h2>
            <ul>
              {pack.zones.upserts.map((zone) => (
                <li key={zone.id}>
                  {zone.id} - {zone.name} (store {zone.store_id})
                </li>
              ))}
            </ul>
          </div>
          <div className="panel">
            <h2>Products</h2>
            <ul>
              {pack.products.upserts.map((product) => (
                <li key={product.id}>
                  {product.id} - {product.name}
                </li>
              ))}
            </ul>
          </div>
          <div className="panel">
            <h2>Product locations</h2>
            <ul>
              {pack.product_locations.upserts.map((location) => (
                <li key={`${location.product_id}-${location.store_id}`}>
                  P{location.product_id} - S{location.store_id} - Z{location.zone_id ?? '-'} (
                  {location.confidence ?? '-'})
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </main>
  );
}
