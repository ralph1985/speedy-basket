CREATE OR REPLACE FUNCTION list_admin_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ,
  roles JSON
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.key = 'admin_god'
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email,
    p.display_name,
    p.created_at,
    COALESCE(
      json_agg(
        json_build_object(
          'key', r.key,
          'store_id', ur.store_id,
          'scope', ur.scope
        )
        ORDER BY r.key
      ) FILTER (WHERE r.key IS NOT NULL),
      '[]'::json
    ) AS roles
  FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  LEFT JOIN user_roles ur ON ur.user_id = u.id
  LEFT JOIN roles r ON r.id = ur.role_id
  GROUP BY u.id, u.email, p.display_name, p.created_at
  ORDER BY p.created_at DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION list_admin_users() TO authenticated;
