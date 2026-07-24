-- =========================================================
-- MANUAL STOCK — MÓDULO DA BIBLIOTECA
-- Cria somente as estruturas que ainda não existem.
-- Não altera profiles, subscriptions, plans, payments
-- ou user_roles.
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- =========================================================
-- ENUM: manual_type
-- =========================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'manual_type'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.manual_type AS ENUM (
      'servico',
      'proprietario',
      'pecas',
      'diagrama_eletrico',
      'esquema_eletrico',
      'injecao',
      'torque',
      'manutencao',
      'hidraulico',
      'boletim',
      'atualizacao',
      'outro'
    );
  END IF;
END
$$;

-- =========================================================
-- FUNÇÕES AUXILIARES
-- =========================================================

CREATE OR REPLACE FUNCTION public.f_unaccent(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
SET search_path = public, pg_catalog
AS $$
  SELECT public.unaccent('public.unaccent', value)
$$;

CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================================================
-- CATEGORIAS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;

DROP POLICY IF EXISTS "categories_public_read"
ON public.categories;

CREATE POLICY "categories_public_read"
ON public.categories
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "categories_admin_all"
ON public.categories;

CREATE POLICY "categories_admin_all"
ON public.categories
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- MARCAS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  logo_url text,
  country text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.brands TO anon, authenticated;
GRANT ALL ON public.brands TO service_role;

DROP POLICY IF EXISTS "brands_public_read"
ON public.brands;

CREATE POLICY "brands_public_read"
ON public.brands
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "brands_admin_all"
ON public.brands;

CREATE POLICY "brands_admin_all"
ON public.brands
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS brands_search_idx
ON public.brands
USING gin (
  public.f_unaccent(name) gin_trgm_ops
);

-- =========================================================
-- MODELOS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  brand_id uuid NOT NULL
    REFERENCES public.brands(id)
    ON DELETE CASCADE,

  category_id uuid
    REFERENCES public.categories(id)
    ON DELETE SET NULL,

  slug text NOT NULL UNIQUE,
  name text NOT NULL,

  year_start integer,
  year_end integer,

  engine text,
  displacement_cc integer,
  fuel_system text,
  fuel text,
  ecu_code text,

  description text,
  image_url text,
  drive_folder_id text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.models TO anon, authenticated;
GRANT ALL ON public.models TO service_role;

DROP POLICY IF EXISTS "models_public_read"
ON public.models;

CREATE POLICY "models_public_read"
ON public.models
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "models_admin_all"
ON public.models;

CREATE POLICY "models_admin_all"
ON public.models
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS models_brand_idx
ON public.models(brand_id);

CREATE INDEX IF NOT EXISTS models_category_idx
ON public.models(category_id);

CREATE INDEX IF NOT EXISTS models_search_idx
ON public.models
USING gin (
  public.f_unaccent(name) gin_trgm_ops
);

DROP TRIGGER IF EXISTS models_updated_at
ON public.models;

CREATE TRIGGER models_updated_at
BEFORE UPDATE ON public.models
FOR EACH ROW
EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- MANUAIS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.manuals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  model_id uuid NOT NULL
    REFERENCES public.models(id)
    ON DELETE CASCADE,

  title text NOT NULL,
  description text,

  manual_type public.manual_type
    NOT NULL
    DEFAULT 'servico',

  year integer,

  language text DEFAULT 'pt-BR',
  format text DEFAULT 'PDF',

  file_size_bytes bigint,
  thumbnail_url text,
  drive_file_id text UNIQUE,

  tags text[] NOT NULL DEFAULT '{}',

  last_updated timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.manuals ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.manuals TO anon, authenticated;
GRANT ALL ON public.manuals TO service_role;

DROP POLICY IF EXISTS "manuals_public_read"
ON public.manuals;

CREATE POLICY "manuals_public_read"
ON public.manuals
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "manuals_admin_all"
ON public.manuals;

CREATE POLICY "manuals_admin_all"
ON public.manuals
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS manuals_model_idx
ON public.manuals(model_id);

CREATE INDEX IF NOT EXISTS manuals_type_idx
ON public.manuals(manual_type);

CREATE INDEX IF NOT EXISTS manuals_updated_idx
ON public.manuals(last_updated DESC);

CREATE INDEX IF NOT EXISTS manuals_search_idx
ON public.manuals
USING gin (
  public.f_unaccent(title) gin_trgm_ops
);

CREATE INDEX IF NOT EXISTS manuals_tags_idx
ON public.manuals
USING gin(tags);

DROP TRIGGER IF EXISTS manuals_updated_at
ON public.manuals;

CREATE TRIGGER manuals_updated_at
BEFORE UPDATE ON public.manuals
FOR EACH ROW
EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- FAVORITOS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id uuid NOT NULL
    REFERENCES auth.users(id)
    ON DELETE CASCADE,

  manual_id uuid NOT NULL
    REFERENCES public.manuals(id)
    ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, manual_id)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE
ON public.favorites
TO authenticated;

GRANT ALL
ON public.favorites
TO service_role;

DROP POLICY IF EXISTS "favorites_select_own"
ON public.favorites;

CREATE POLICY "favorites_select_own"
ON public.favorites
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "favorites_insert_own"
ON public.favorites;

CREATE POLICY "favorites_insert_own"
ON public.favorites
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "favorites_delete_own"
ON public.favorites;

CREATE POLICY "favorites_delete_own"
ON public.favorites
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS favorites_user_idx
ON public.favorites(user_id);

CREATE INDEX IF NOT EXISTS favorites_manual_idx
ON public.favorites(manual_id);

-- =========================================================
-- DOWNLOADS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id uuid NOT NULL
    REFERENCES auth.users(id)
    ON DELETE CASCADE,

  manual_id uuid NOT NULL
    REFERENCES public.manuals(id)
    ON DELETE CASCADE,

  downloaded_at timestamptz NOT NULL DEFAULT now(),

  ip text,
  user_agent text
);

ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;

GRANT SELECT
ON public.downloads
TO authenticated;

GRANT ALL
ON public.downloads
TO service_role;

DROP POLICY IF EXISTS "downloads_select_own"
ON public.downloads;

CREATE POLICY "downloads_select_own"
ON public.downloads
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "downloads_admin_read"
ON public.downloads;

CREATE POLICY "downloads_admin_read"
ON public.downloads
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS downloads_user_time_idx
ON public.downloads(
  user_id,
  downloaded_at DESC
);

CREATE INDEX IF NOT EXISTS downloads_manual_idx
ON public.downloads(manual_id);

-- =========================================================
-- LOGS DE ATIVIDADE
-- =========================================================

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id uuid
    REFERENCES auth.users(id)
    ON DELETE SET NULL,

  action text NOT NULL,

  meta jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

GRANT INSERT
ON public.activity_logs
TO authenticated;

GRANT ALL
ON public.activity_logs
TO service_role;

DROP POLICY IF EXISTS "activity_logs_insert_authenticated"
ON public.activity_logs;

CREATE POLICY "activity_logs_insert_authenticated"
ON public.activity_logs
FOR INSERT
TO authenticated
WITH CHECK (
  user_id IS NULL
  OR user_id = auth.uid()
);

DROP POLICY IF EXISTS "activity_logs_admin_read"
ON public.activity_logs;

CREATE POLICY "activity_logs_admin_read"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS activity_logs_created_idx
ON public.activity_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS activity_logs_user_idx
ON public.activity_logs(user_id);

-- =========================================================
-- SINCRONIZAÇÃO COM GOOGLE DRIVE
-- =========================================================

CREATE TABLE IF NOT EXISTS public.sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  folder_id text NOT NULL,
  folder_name text,

  started_by uuid
    REFERENCES auth.users(id)
    ON DELETE SET NULL,

  status text NOT NULL DEFAULT 'running',

  files_seen integer NOT NULL DEFAULT 0,
  files_imported integer NOT NULL DEFAULT 0,
  files_updated integer NOT NULL DEFAULT 0,
  files_skipped integer NOT NULL DEFAULT 0,

  error_message text,

  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,

  CONSTRAINT sync_jobs_status_check
    CHECK (
      status IN (
        'running',
        'success',
        'error'
      )
    )
);

ALTER TABLE public.sync_jobs ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.sync_jobs
TO authenticated;

GRANT ALL
ON public.sync_jobs
TO service_role;

DROP POLICY IF EXISTS "sync_jobs_admin_all"
ON public.sync_jobs;

CREATE POLICY "sync_jobs_admin_all"
ON public.sync_jobs
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS sync_jobs_started_idx
ON public.sync_jobs(started_at DESC);

-- =========================================================
-- PESQUISA DA BIBLIOTECA
-- =========================================================

CREATE OR REPLACE FUNCTION public.search_library(
  _q text,
  _limit integer DEFAULT 30
)
RETURNS TABLE (
  manual_id uuid,
  title text,
  manual_type public.manual_type,
  thumbnail_url text,
  format text,
  file_size_bytes bigint,

  model_id uuid,
  model_name text,
  model_slug text,

  year_start integer,
  year_end integer,
  engine text,
  displacement_cc integer,

  brand_name text,
  brand_slug text,

  score real
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH query_value AS (
    SELECT
      COALESCE(
        NULLIF(trim(_q), ''),
        ''
      ) AS search_term
  )

  SELECT
    manual.id,
    manual.title,
    manual.manual_type,
    manual.thumbnail_url,
    manual.format,
    manual.file_size_bytes,

    model.id,
    model.name,
    model.slug,

    model.year_start,
    model.year_end,
    model.engine,
    model.displacement_cc,

    brand.name,
    brand.slug,

    GREATEST(
      similarity(
        public.f_unaccent(manual.title),
        public.f_unaccent(
          (
            SELECT search_term
            FROM query_value
          )
        )
      ),

      similarity(
        public.f_unaccent(model.name),
        public.f_unaccent(
          (
            SELECT search_term
            FROM query_value
          )
        )
      ),

      similarity(
        public.f_unaccent(brand.name),
        public.f_unaccent(
          (
            SELECT search_term
            FROM query_value
          )
        )
      )
    )::real AS score

  FROM public.manuals AS manual

  JOIN public.models AS model
    ON model.id = manual.model_id

  JOIN public.brands AS brand
    ON brand.id = model.brand_id

  WHERE
    (
      SELECT search_term
      FROM query_value
    ) = ''

    OR public.f_unaccent(
      manual.title
    ) ILIKE (
      '%' ||
      public.f_unaccent(
        (
          SELECT search_term
          FROM query_value
        )
      ) ||
      '%'
    )

    OR public.f_unaccent(
      model.name
    ) ILIKE (
      '%' ||
      public.f_unaccent(
        (
          SELECT search_term
          FROM query_value
        )
      ) ||
      '%'
    )

    OR public.f_unaccent(
      brand.name
    ) ILIKE (
      '%' ||
      public.f_unaccent(
        (
          SELECT search_term
          FROM query_value
        )
      ) ||
      '%'
    )

    OR EXISTS (
      SELECT 1
      FROM unnest(manual.tags) AS tag
      WHERE public.f_unaccent(tag)
        ILIKE (
          '%' ||
          public.f_unaccent(
            (
              SELECT search_term
              FROM query_value
            )
          ) ||
          '%'
        )
    )

  ORDER BY
    score DESC NULLS LAST,
    manual.last_updated DESC

  LIMIT LEAST(
    GREATEST(_limit, 1),
    100
  );
$$;

GRANT EXECUTE
ON FUNCTION public.search_library(text, integer)
TO anon, authenticated;

-- =========================================================
-- SEEDS
-- =========================================================

INSERT INTO public.categories (
  slug,
  name
)
VALUES
  ('street', 'Street'),
  ('naked', 'Naked'),
  ('esportiva', 'Esportiva'),
  ('trail', 'Trail'),
  ('big-trail', 'Big Trail'),
  ('custom', 'Custom'),
  ('scooter', 'Scooter'),
  ('off-road', 'Off-road'),
  ('touring', 'Touring')
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name;

INSERT INTO public.brands (
  slug,
  name,
  country
)
VALUES
  ('honda', 'Honda', 'Japão'),
  ('yamaha', 'Yamaha', 'Japão'),
  ('kawasaki', 'Kawasaki', 'Japão'),
  ('suzuki', 'Suzuki', 'Japão'),
  ('bmw', 'BMW Motorrad', 'Alemanha'),
  ('harley-davidson', 'Harley-Davidson', 'EUA'),
  ('ducati', 'Ducati', 'Itália'),
  ('triumph', 'Triumph', 'Reino Unido'),
  ('ktm', 'KTM', 'Áustria'),
  ('royal-enfield', 'Royal Enfield', 'Índia'),
  ('cfmoto', 'CFMoto', 'China'),
  ('bajaj', 'Bajaj', 'Índia'),
  ('dafra', 'Dafra', 'Brasil'),
  ('shineray', 'Shineray', 'Brasil'),
  ('haojue', 'Haojue', 'China')
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  country = EXCLUDED.country;