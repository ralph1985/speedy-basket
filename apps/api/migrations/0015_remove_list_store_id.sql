DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'shopping_lists'
      AND column_name = 'store_id'
  ) THEN
    EXECUTE 'UPDATE shopping_lists SET store_id = NULL';
    EXECUTE 'ALTER TABLE shopping_lists DROP COLUMN store_id';
  END IF;
END $$;
