INSERT INTO regions (slug, name, type, geometry, metadata)
VALUES
  (
    'strait-of-hormuz',
    'Strait of Hormuz',
    'chokepoint',
    ST_GeogFromText('POLYGON((56.0 24.0,56.8 24.0,56.8 26.8,56.0 26.8,56.0 24.0))'),
    '{"priority": 1, "domain_tags": ["oil", "shipping", "conflict"]}'::jsonb
  ),
  (
    'bab-el-mandeb-red-sea',
    'Bab el-Mandeb / Red Sea',
    'chokepoint',
    ST_GeogFromText('POLYGON((42.0 11.0,45.6 11.0,45.6 18.2,42.0 18.2,42.0 11.0))'),
    '{"priority": 1, "domain_tags": ["shipping", "conflict", "oil"]}'::jsonb
  ),
  (
    'suez-canal',
    'Suez Canal',
    'chokepoint',
    ST_GeogFromText('POLYGON((31.8 29.5,33.1 29.5,33.1 31.8,31.8 31.8,31.8 29.5))'),
    '{"priority": 1, "domain_tags": ["shipping", "oil"]}'::jsonb
  ),
  (
    'taiwan-strait',
    'Taiwan Strait',
    'chokepoint',
    ST_GeogFromText('POLYGON((117.0 21.0,122.5 21.0,122.5 27.8,117.0 27.8,117.0 21.0))'),
    '{"priority": 1, "domain_tags": ["shipping", "conflict", "narrative"]}'::jsonb
  ),
  (
    'south-china-sea',
    'South China Sea',
    'maritime',
    ST_GeogFromText('POLYGON((107.0 2.0,121.5 2.0,121.5 21.5,107.0 21.5,107.0 2.0))'),
    '{"priority": 1, "domain_tags": ["shipping", "conflict", "energy"]}'::jsonb
  ),
  (
    'black-sea',
    'Black Sea',
    'maritime',
    ST_GeogFromText('POLYGON((27.0 40.0,42.5 40.0,42.5 47.5,27.0 47.5,27.0 40.0))'),
    '{"priority": 1, "domain_tags": ["shipping", "conflict", "grain"]}'::jsonb
  ),
  (
    'ukraine',
    'Ukraine',
    'state',
    ST_GeogFromText('POLYGON((22.0 44.0,40.5 44.0,40.5 53.0,22.0 53.0,22.0 44.0))'),
    '{"priority": 1, "domain_tags": ["conflict", "displacement"]}'::jsonb
  ),
  (
    'israel-gaza-lebanon',
    'Israel / Gaza / Lebanon cluster',
    'cluster',
    ST_GeogFromText('POLYGON((33.5 29.0,37.3 29.0,37.3 34.8,33.5 34.8,33.5 29.0))'),
    '{"priority": 1, "domain_tags": ["conflict", "displacement", "narrative"]}'::jsonb
  ),
  (
    'iran-gulf',
    'Iran / Gulf region',
    'cluster',
    ST_GeogFromText('POLYGON((46.0 22.0,58.5 22.0,58.5 33.2,46.0 33.2,46.0 22.0))'),
    '{"priority": 1, "domain_tags": ["conflict", "oil", "shipping"]}'::jsonb
  ),
  (
    'kashmir-india-pakistan',
    'Kashmir / India-Pakistan border',
    'cluster',
    ST_GeogFromText('POLYGON((72.0 30.0,79.5 30.0,79.5 36.8,72.0 36.8,72.0 30.0))'),
    '{"priority": 2, "domain_tags": ["conflict", "narrative"]}'::jsonb
  ),
  (
    'korean-peninsula',
    'Korean Peninsula',
    'cluster',
    ST_GeogFromText('POLYGON((124.0 33.0,131.5 33.0,131.5 43.0,124.0 43.0,124.0 33.0))'),
    '{"priority": 2, "domain_tags": ["conflict", "narrative", "shipping"]}'::jsonb
  ),
  (
    'eastern-mediterranean',
    'Eastern Mediterranean',
    'maritime',
    ST_GeogFromText('POLYGON((24.0 30.0,37.8 30.0,37.8 38.0,24.0 38.0,24.0 30.0))'),
    '{"priority": 2, "domain_tags": ["shipping", "energy", "conflict"]}'::jsonb
  )
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  geometry = EXCLUDED.geometry,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();
