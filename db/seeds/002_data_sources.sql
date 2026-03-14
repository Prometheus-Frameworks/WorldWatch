INSERT INTO data_sources (name, freshness_minutes, reliability_weight)
VALUES
  ('acled', 1440, 0.900),
  ('gdelt', 360, 0.650),
  ('imf-portwatch', 720, 0.800),
  ('eia', 1440, 0.850)
ON CONFLICT (name) DO UPDATE
SET freshness_minutes = EXCLUDED.freshness_minutes,
    reliability_weight = EXCLUDED.reliability_weight,
    updated_at = NOW();
