export type PackTable<T> = {
  upserts: T[];
  deletes: Array<number | string>;
};

export type Pack = {
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

export type UserRole = { key: string; store_id: number | null; scope: string };

export type UserRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  roles: UserRole[];
};

export type TabKey = 'store' | 'zones' | 'locations' | 'products' | 'users';

export type NavItem = { key: TabKey; label: string; description: string };
