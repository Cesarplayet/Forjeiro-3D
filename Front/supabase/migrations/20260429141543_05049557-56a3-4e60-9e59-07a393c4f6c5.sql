
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by owner" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Profiles insert by owner" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Profiles update by owner" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp helper
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name_pt TEXT NOT NULL,
  name_en TEXT NOT NULL,
  icon TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories are public" ON public.categories FOR SELECT USING (true);

INSERT INTO public.categories (slug, name_pt, name_en, icon, sort_order) VALUES
  ('games', 'Games', 'Games', 'Gamepad2', 1),
  ('cozinha', 'Cozinha', 'Kitchen', 'UtensilsCrossed', 2),
  ('utilitarios', 'Utilitários', 'Utility', 'Wrench', 3),
  ('decoracao', 'Decoração', 'Decor', 'Sparkles', 4),
  ('mini-me', 'Mini-Me', 'Mini-Me', 'User', 5);

-- Products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name_pt TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_pt TEXT,
  description_en TEXT,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  image_url TEXT,
  stock INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active products are public" ON public.products FOR SELECT USING (active = true);

-- Sample products
INSERT INTO public.products (category_id, name_pt, name_en, description_pt, description_en, price, image_url, stock)
SELECT c.id, p.name_pt, p.name_en, p.desc_pt, p.desc_en, p.price, p.img, 25
FROM public.categories c
JOIN (VALUES
  ('games', 'Controle Stand PS5', 'PS5 Controller Stand', 'Suporte impresso em PLA premium', 'Premium PLA printed stand', 89.90, 'https://images.unsplash.com/photo-1606318313846-f0a4f5e94f6f?w=600'),
  ('games', 'Mini Console Retrô', 'Retro Mini Console', 'Réplica decorativa de console clássico', 'Decorative classic console replica', 129.90, 'https://images.unsplash.com/photo-1531525645387-7f14be1bdbbd?w=600'),
  ('cozinha', 'Porta-temperos Modular', 'Modular Spice Holder', 'Encaixe modular para sua bancada', 'Modular fit for your countertop', 69.90, 'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?w=600'),
  ('cozinha', 'Suporte para Tábuas', 'Cutting Board Stand', 'Organize suas tábuas com estilo', 'Organize your boards in style', 59.90, 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600'),
  ('utilitarios', 'Organizador de Cabos', 'Cable Organizer', 'Acabou a bagunça na mesa', 'No more desk mess', 39.90, 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=600'),
  ('utilitarios', 'Suporte para Celular', 'Phone Stand', 'Ajustável e resistente', 'Adjustable and sturdy', 34.90, 'https://images.unsplash.com/photo-1512446816042-444d641267d4?w=600'),
  ('decoracao', 'Vaso Geométrico', 'Geometric Vase', 'Design contemporâneo', 'Contemporary design', 79.90, 'https://images.unsplash.com/photo-1490312278390-ab64016e0aa9?w=600'),
  ('decoracao', 'Luminária Lua', 'Moon Lamp', 'Ilumine o seu ambiente', 'Light up your space', 149.90, 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=600')
) AS p(cat_slug, name_pt, name_en, desc_pt, desc_en, price, img)
ON c.slug = p.cat_slug;

-- Mini-Me requests
CREATE TYPE public.mini_me_status AS ENUM ('uploading','processing','preview_ready','support_requested','approved','printing','shipped','completed','failed');

CREATE TABLE public.mini_me_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_paths TEXT[] NOT NULL DEFAULT '{}',
  status public.mini_me_status NOT NULL DEFAULT 'uploading',
  model_url TEXT,
  preview_image_url TEXT,
  size_cm NUMERIC(5,1) DEFAULT 15.0,
  notes TEXT,
  support_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mini_me_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mini-me select own" ON public.mini_me_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Mini-me insert own" ON public.mini_me_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Mini-me update own" ON public.mini_me_requests FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER mini_me_touch BEFORE UPDATE ON public.mini_me_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Orders
CREATE TYPE public.order_status AS ENUM ('pending','paid','printing','shipped','delivered','cancelled');

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  cep TEXT,
  address JSONB,
  status public.order_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Orders select own" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Orders insert own" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Orders update own" ON public.orders FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER orders_touch BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('product-images', 'product-images', true),
  ('mini-me-photos', 'mini-me-photos', false),
  ('mini-me-models', 'mini-me-models', false)
ON CONFLICT (id) DO NOTHING;

-- product-images: public read
CREATE POLICY "Product images public read" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');

-- mini-me-photos: owner only (path prefix = user id)
CREATE POLICY "Mini-me photos owner read" ON storage.objects FOR SELECT
  USING (bucket_id = 'mini-me-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Mini-me photos owner insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'mini-me-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Mini-me photos owner delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'mini-me-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- mini-me-models: owner read only
CREATE POLICY "Mini-me models owner read" ON storage.objects FOR SELECT
  USING (bucket_id = 'mini-me-models' AND auth.uid()::text = (storage.foldername(name))[1]);
