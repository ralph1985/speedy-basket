CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  store_id BIGINT REFERENCES stores(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'store',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, role_id, store_id)
);

CREATE TABLE IF NOT EXISTS shopping_lists (
  id BIGSERIAL PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  store_id BIGINT REFERENCES stores(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shopping_list_members (
  list_id BIGINT NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (list_id, user_id)
);

CREATE TABLE IF NOT EXISTS shopping_list_items (
  id BIGSERIAL PRIMARY KEY,
  list_id BIGINT NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
  label TEXT,
  qty TEXT,
  checked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO roles (key) VALUES
  ('admin'),
  ('map_editor'),
  ('store_editor'),
  ('user')
ON CONFLICT (key) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_store ON user_roles (store_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_members_user ON shopping_list_members (user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_items_list ON shopping_list_items (list_id);

CREATE OR REPLACE FUNCTION has_store_role(p_store_id BIGINT, p_role_keys TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND (ur.store_id = p_store_id OR ur.store_id IS NULL)
      AND r.key = ANY(p_role_keys)
  );
$$;

CREATE OR REPLACE FUNCTION is_list_owner(p_list_id BIGINT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM shopping_lists l
    WHERE l.id = p_list_id
      AND l.owner_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION is_list_member(p_list_id BIGINT, p_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM shopping_list_members m
    WHERE m.list_id = p_list_id
      AND m.user_id = auth.uid()
      AND m.role = ANY(p_roles)
  );
$$;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select ON profiles;
DROP POLICY IF EXISTS profiles_insert ON profiles;
DROP POLICY IF EXISTS profiles_update ON profiles;
DROP POLICY IF EXISTS profiles_delete ON profiles;
CREATE POLICY profiles_select ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());
CREATE POLICY profiles_insert ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY profiles_update ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
CREATE POLICY profiles_delete ON profiles
  FOR DELETE TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS roles_select ON roles;
CREATE POLICY roles_select ON roles
  FOR SELECT TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS user_roles_select ON user_roles;
DROP POLICY IF EXISTS user_roles_insert ON user_roles;
DROP POLICY IF EXISTS user_roles_update ON user_roles;
DROP POLICY IF EXISTS user_roles_delete ON user_roles;
CREATE POLICY user_roles_select ON user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_store_role(store_id, ARRAY['admin']));
CREATE POLICY user_roles_insert ON user_roles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR has_store_role(store_id, ARRAY['admin']));
CREATE POLICY user_roles_update ON user_roles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR has_store_role(store_id, ARRAY['admin']))
  WITH CHECK (user_id = auth.uid() OR has_store_role(store_id, ARRAY['admin']));
CREATE POLICY user_roles_delete ON user_roles
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR has_store_role(store_id, ARRAY['admin']));

DROP POLICY IF EXISTS stores_select ON stores;
DROP POLICY IF EXISTS stores_insert ON stores;
DROP POLICY IF EXISTS stores_update ON stores;
DROP POLICY IF EXISTS stores_delete ON stores;
CREATE POLICY stores_select ON stores
  FOR SELECT TO authenticated
  USING (TRUE);
CREATE POLICY stores_insert ON stores
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY stores_update ON stores
  FOR UPDATE TO authenticated
  USING (has_store_role(id, ARRAY['admin', 'store_editor']))
  WITH CHECK (has_store_role(id, ARRAY['admin', 'store_editor']));
CREATE POLICY stores_delete ON stores
  FOR DELETE TO authenticated
  USING (has_store_role(id, ARRAY['admin', 'store_editor']));

DROP POLICY IF EXISTS zones_select ON zones;
DROP POLICY IF EXISTS zones_insert ON zones;
DROP POLICY IF EXISTS zones_update ON zones;
DROP POLICY IF EXISTS zones_delete ON zones;
CREATE POLICY zones_select ON zones
  FOR SELECT TO authenticated
  USING (TRUE);
CREATE POLICY zones_insert ON zones
  FOR INSERT TO authenticated
  WITH CHECK (has_store_role(store_id, ARRAY['admin', 'map_editor', 'store_editor']));
CREATE POLICY zones_update ON zones
  FOR UPDATE TO authenticated
  USING (has_store_role(store_id, ARRAY['admin', 'map_editor', 'store_editor']))
  WITH CHECK (has_store_role(store_id, ARRAY['admin', 'map_editor', 'store_editor']));
CREATE POLICY zones_delete ON zones
  FOR DELETE TO authenticated
  USING (has_store_role(store_id, ARRAY['admin', 'map_editor', 'store_editor']));

DROP POLICY IF EXISTS products_select ON products;
DROP POLICY IF EXISTS products_insert ON products;
DROP POLICY IF EXISTS products_update ON products;
DROP POLICY IF EXISTS products_delete ON products;
CREATE POLICY products_select ON products
  FOR SELECT TO authenticated
  USING (TRUE);
CREATE POLICY products_insert ON products
  FOR INSERT TO authenticated
  WITH CHECK (has_store_role(NULL, ARRAY['admin']));
CREATE POLICY products_update ON products
  FOR UPDATE TO authenticated
  USING (has_store_role(NULL, ARRAY['admin']))
  WITH CHECK (has_store_role(NULL, ARRAY['admin']));
CREATE POLICY products_delete ON products
  FOR DELETE TO authenticated
  USING (has_store_role(NULL, ARRAY['admin']));

DROP POLICY IF EXISTS product_locations_select ON product_locations;
DROP POLICY IF EXISTS product_locations_insert ON product_locations;
DROP POLICY IF EXISTS product_locations_update ON product_locations;
DROP POLICY IF EXISTS product_locations_delete ON product_locations;
CREATE POLICY product_locations_select ON product_locations
  FOR SELECT TO authenticated
  USING (TRUE);
CREATE POLICY product_locations_insert ON product_locations
  FOR INSERT TO authenticated
  WITH CHECK (has_store_role(store_id, ARRAY['admin', 'map_editor', 'store_editor']));
CREATE POLICY product_locations_update ON product_locations
  FOR UPDATE TO authenticated
  USING (has_store_role(store_id, ARRAY['admin', 'map_editor', 'store_editor']))
  WITH CHECK (has_store_role(store_id, ARRAY['admin', 'map_editor', 'store_editor']));
CREATE POLICY product_locations_delete ON product_locations
  FOR DELETE TO authenticated
  USING (has_store_role(store_id, ARRAY['admin', 'map_editor', 'store_editor']));

DROP POLICY IF EXISTS events_select ON events;
DROP POLICY IF EXISTS events_insert ON events;
CREATE POLICY events_select ON events
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_store_role(store_id, ARRAY['admin', 'store_editor']));
CREATE POLICY events_insert ON events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS store_packs_select ON store_packs;
DROP POLICY IF EXISTS store_packs_update ON store_packs;
DROP POLICY IF EXISTS store_packs_insert ON store_packs;
CREATE POLICY store_packs_select ON store_packs
  FOR SELECT TO authenticated
  USING (TRUE);
CREATE POLICY store_packs_update ON store_packs
  FOR UPDATE TO authenticated
  USING (has_store_role(store_id, ARRAY['admin', 'store_editor']))
  WITH CHECK (has_store_role(store_id, ARRAY['admin', 'store_editor']));
CREATE POLICY store_packs_insert ON store_packs
  FOR INSERT TO authenticated
  WITH CHECK (has_store_role(store_id, ARRAY['admin', 'store_editor']));

DROP POLICY IF EXISTS shopping_lists_select ON shopping_lists;
DROP POLICY IF EXISTS shopping_lists_insert ON shopping_lists;
DROP POLICY IF EXISTS shopping_lists_update ON shopping_lists;
DROP POLICY IF EXISTS shopping_lists_delete ON shopping_lists;
CREATE POLICY shopping_lists_select ON shopping_lists
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR is_list_member(id, ARRAY['owner', 'editor', 'viewer'])
  );
CREATE POLICY shopping_lists_insert ON shopping_lists
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY shopping_lists_update ON shopping_lists
  FOR UPDATE TO authenticated
  USING (
    owner_id = auth.uid()
    OR is_list_member(id, ARRAY['owner', 'editor'])
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR is_list_member(id, ARRAY['owner', 'editor'])
  );
CREATE POLICY shopping_lists_delete ON shopping_lists
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS shopping_list_members_select ON shopping_list_members;
DROP POLICY IF EXISTS shopping_list_members_insert ON shopping_list_members;
DROP POLICY IF EXISTS shopping_list_members_update ON shopping_list_members;
DROP POLICY IF EXISTS shopping_list_members_delete ON shopping_list_members;
CREATE POLICY shopping_list_members_select ON shopping_list_members
  FOR SELECT TO authenticated
  USING (
    is_list_owner(list_id)
    OR is_list_member(list_id, ARRAY['owner', 'editor', 'viewer'])
  );
CREATE POLICY shopping_list_members_insert ON shopping_list_members
  FOR INSERT TO authenticated
  WITH CHECK (
    is_list_owner(list_id)
    OR is_list_member(list_id, ARRAY['owner', 'editor'])
  );
CREATE POLICY shopping_list_members_update ON shopping_list_members
  FOR UPDATE TO authenticated
  USING (
    is_list_owner(list_id)
    OR is_list_member(list_id, ARRAY['owner', 'editor'])
  )
  WITH CHECK (
    is_list_owner(list_id)
    OR is_list_member(list_id, ARRAY['owner', 'editor'])
  );
CREATE POLICY shopping_list_members_delete ON shopping_list_members
  FOR DELETE TO authenticated
  USING (
    is_list_owner(list_id)
    OR is_list_member(list_id, ARRAY['owner', 'editor'])
  );

DROP POLICY IF EXISTS shopping_list_items_select ON shopping_list_items;
DROP POLICY IF EXISTS shopping_list_items_insert ON shopping_list_items;
DROP POLICY IF EXISTS shopping_list_items_update ON shopping_list_items;
DROP POLICY IF EXISTS shopping_list_items_delete ON shopping_list_items;
CREATE POLICY shopping_list_items_select ON shopping_list_items
  FOR SELECT TO authenticated
  USING (
    is_list_owner(list_id)
    OR is_list_member(list_id, ARRAY['owner', 'editor', 'viewer'])
  );
CREATE POLICY shopping_list_items_insert ON shopping_list_items
  FOR INSERT TO authenticated
  WITH CHECK (
    is_list_owner(list_id)
    OR is_list_member(list_id, ARRAY['owner', 'editor'])
  );
CREATE POLICY shopping_list_items_update ON shopping_list_items
  FOR UPDATE TO authenticated
  USING (
    is_list_owner(list_id)
    OR is_list_member(list_id, ARRAY['owner', 'editor'])
  )
  WITH CHECK (
    is_list_owner(list_id)
    OR is_list_member(list_id, ARRAY['owner', 'editor'])
  );
CREATE POLICY shopping_list_items_delete ON shopping_list_items
  FOR DELETE TO authenticated
  USING (
    is_list_owner(list_id)
    OR is_list_member(list_id, ARRAY['owner', 'editor'])
  );
