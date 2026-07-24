
-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Enums
CREATE TYPE public.app_role AS ENUM ('visitante', 'assinante', 'admin');
CREATE TYPE public.subscription_status AS ENUM ('active', 'trialing', 'past_due', 'canceled', 'expired', 'none');
CREATE TYPE public.manual_type AS ENUM (
  'servico', 'proprietario', 'pecas', 'diagrama_eletrico', 'esquema_eletrico',
  'injecao', 'torque', 'manutencao', 'hidraulico', 'boletim', 'atualizacao', 'outro'
);

-- Immutable unaccent wrapper (for indexes)
CREATE OR REPLACE FUNCTION public.f_unaccent(text)
RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
SET search_path = public, pg_catalog
AS $$ SELECT public.unaccent('public.unaccent', $1) $$;

-- Updated_at helper
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'visitante')
    ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Subscriptions
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL DEFAULT 'Manual Stock Pro',
  status subscription_status NOT NULL DEFAULT 'none',
  provider TEXT,
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscriptions_select_own" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER subs_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id
      AND status IN ('active', 'trialing')
      AND (current_period_end IS NULL OR current_period_end > now())
  ) OR public.has_role(_user_id, 'admin')
$$;

-- Categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_public_read" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "categories_admin_all" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Brands
CREATE TABLE public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  logo_url TEXT,
  country TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.brands TO anon, authenticated;
GRANT ALL ON public.brands TO service_role;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brands_public_read" ON public.brands FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "brands_admin_all" ON public.brands FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX brands_search_idx ON public.brands USING gin (public.f_unaccent(name) gin_trgm_ops);

-- Models (motos)
CREATE TABLE public.models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  year_start INT,
  year_end INT,
  engine TEXT,
  displacement_cc INT,
  fuel_system TEXT,
  fuel TEXT,
  ecu_code TEXT,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.models TO anon, authenticated;
GRANT ALL ON public.models TO service_role;
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "models_public_read" ON public.models FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "models_admin_all" ON public.models FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX models_brand_idx ON public.models(brand_id);
CREATE INDEX models_search_idx ON public.models USING gin (public.f_unaccent(name) gin_trgm_ops);
CREATE TRIGGER models_updated_at BEFORE UPDATE ON public.models FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Manuals
CREATE TABLE public.manuals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  manual_type manual_type NOT NULL DEFAULT 'servico',
  year INT,
  language TEXT DEFAULT 'pt-BR',
  format TEXT DEFAULT 'PDF',
  file_size_bytes BIGINT,
  thumbnail_url TEXT,
  drive_file_id TEXT,
  tags TEXT[] DEFAULT '{}',
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.manuals TO anon, authenticated;
GRANT ALL ON public.manuals TO service_role;
ALTER TABLE public.manuals ENABLE ROW LEVEL SECURITY;
-- Metadata is public; the actual file download is gated by has_active_subscription in the server fn
CREATE POLICY "manuals_public_read" ON public.manuals FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "manuals_admin_all" ON public.manuals FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX manuals_model_idx ON public.manuals(model_id);
CREATE INDEX manuals_search_idx ON public.manuals USING gin (public.f_unaccent(title) gin_trgm_ops);
CREATE INDEX manuals_tags_idx ON public.manuals USING gin (tags);
CREATE TRIGGER manuals_updated_at BEFORE UPDATE ON public.manuals FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Favorites
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  manual_id UUID NOT NULL REFERENCES public.manuals(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, manual_id)
);
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "favorites_select_own" ON public.favorites FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "favorites_insert_own" ON public.favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "favorites_delete_own" ON public.favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX favorites_user_idx ON public.favorites(user_id);

-- Downloads (history)
CREATE TABLE public.downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  manual_id UUID NOT NULL REFERENCES public.manuals(id) ON DELETE CASCADE,
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip TEXT,
  user_agent TEXT
);
GRANT SELECT ON public.downloads TO authenticated;
GRANT ALL ON public.downloads TO service_role;
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "downloads_select_own" ON public.downloads FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX downloads_user_time_idx ON public.downloads(user_id, downloaded_at DESC);

-- Activity logs (admin visible)
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "logs_admin_read" ON public.activity_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Search function: retorna manuais + moto + marca com ranking simples
CREATE OR REPLACE FUNCTION public.search_library(_q TEXT, _limit INT DEFAULT 30)
RETURNS TABLE (
  manual_id UUID,
  title TEXT,
  manual_type manual_type,
  thumbnail_url TEXT,
  format TEXT,
  file_size_bytes BIGINT,
  model_id UUID,
  model_name TEXT,
  model_slug TEXT,
  year_start INT,
  year_end INT,
  engine TEXT,
  displacement_cc INT,
  brand_name TEXT,
  brand_slug TEXT,
  score REAL
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH q AS (SELECT COALESCE(NULLIF(trim(_q), ''), '') AS s)
  SELECT
    m.id, m.title, m.manual_type, m.thumbnail_url, m.format, m.file_size_bytes,
    mo.id, mo.name, mo.slug, mo.year_start, mo.year_end, mo.engine, mo.displacement_cc,
    b.name, b.slug,
    GREATEST(
      similarity(f_unaccent(m.title), f_unaccent((SELECT s FROM q))),
      similarity(f_unaccent(mo.name), f_unaccent((SELECT s FROM q))),
      similarity(f_unaccent(b.name), f_unaccent((SELECT s FROM q)))
    ) AS score
  FROM public.manuals m
  JOIN public.models mo ON mo.id = m.model_id
  JOIN public.brands b ON b.id = mo.brand_id
  WHERE (SELECT s FROM q) = ''
     OR f_unaccent(m.title) ILIKE '%' || f_unaccent((SELECT s FROM q)) || '%'
     OR f_unaccent(mo.name) ILIKE '%' || f_unaccent((SELECT s FROM q)) || '%'
     OR f_unaccent(b.name) ILIKE '%' || f_unaccent((SELECT s FROM q)) || '%'
     OR EXISTS (SELECT 1 FROM unnest(m.tags) t WHERE f_unaccent(t) ILIKE '%' || f_unaccent((SELECT s FROM q)) || '%')
  ORDER BY score DESC NULLS LAST, m.last_updated DESC
  LIMIT _limit
$$;

GRANT EXECUTE ON FUNCTION public.search_library(TEXT, INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(UUID) TO authenticated;

-- Seed: categorias e marcas
INSERT INTO public.categories (slug, name) VALUES
  ('street', 'Street'),
  ('naked', 'Naked'),
  ('esportiva', 'Esportiva'),
  ('trail', 'Trail'),
  ('big-trail', 'Big Trail'),
  ('custom', 'Custom'),
  ('scooter', 'Scooter'),
  ('off-road', 'Off-road'),
  ('touring', 'Touring');

INSERT INTO public.brands (slug, name, country) VALUES
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
  ('haojue', 'Haojue', 'China');
