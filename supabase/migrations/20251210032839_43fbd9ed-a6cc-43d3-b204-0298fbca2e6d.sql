-- =============================================
-- PASO 1: ELIMINAR POLÍTICAS QUE DEPENDEN DEL ENUM
-- =============================================

-- Políticas de affiliations
DROP POLICY IF EXISTS "Admins can view their affiliations" ON public.affiliations;
DROP POLICY IF EXISTS "Admins can create affiliations" ON public.affiliations;
DROP POLICY IF EXISTS "Admins can view their client affiliations" ON public.affiliations;

-- Políticas de admin_locations
DROP POLICY IF EXISTS "Admins can insert own locations" ON public.admin_locations;
DROP POLICY IF EXISTS "Admins can view own locations" ON public.admin_locations;
DROP POLICY IF EXISTS "Admins can update own location active status" ON public.admin_locations;

-- Políticas de admin_qr_codes
DROP POLICY IF EXISTS "Admins can view own QR code" ON public.admin_qr_codes;
DROP POLICY IF EXISTS "Admins can insert own QR code" ON public.admin_qr_codes;

-- Políticas de user_roles
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can assign roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can revoke roles" ON public.user_roles;

-- Políticas de profiles
DROP POLICY IF EXISTS "Admins can view affiliated user profiles" ON public.profiles;

-- Políticas de walker_profiles
DROP POLICY IF EXISTS "Walkers can insert own profile" ON public.walker_profiles;
DROP POLICY IF EXISTS "Walkers can update own profile" ON public.walker_profiles;

-- Políticas de walk_requests
DROP POLICY IF EXISTS "Walkers can view requests to them" ON public.walk_requests;
DROP POLICY IF EXISTS "Walkers can update requests to them" ON public.walk_requests;

-- =============================================
-- PASO 2: ELIMINAR LA FUNCIÓN has_role
-- =============================================
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);

-- =============================================
-- PASO 3: CAMBIAR COLUMNA A TEXT TEMPORALMENTE
-- =============================================
ALTER TABLE public.user_roles ALTER COLUMN role TYPE text;

-- =============================================
-- PASO 4: ACTUALIZAR VALORES 'admin' -> 'walker'
-- =============================================
UPDATE public.user_roles SET role = 'walker' WHERE role = 'admin';

-- =============================================
-- PASO 5: ELIMINAR ENUM VIEJO Y CREAR NUEVO
-- =============================================
DROP TYPE IF EXISTS public.app_role;
CREATE TYPE public.app_role AS ENUM ('walker', 'user');

-- =============================================
-- PASO 6: CONVERTIR COLUMNA AL NUEVO ENUM
-- =============================================
ALTER TABLE public.user_roles ALTER COLUMN role TYPE public.app_role USING role::public.app_role;

-- =============================================
-- PASO 7: RECREAR FUNCIÓN has_role
-- =============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- =============================================
-- PASO 8: RECREAR TODAS LAS POLÍTICAS CON 'walker'
-- =============================================

-- Políticas de affiliations
CREATE POLICY "Walkers can view their affiliations"
ON public.affiliations FOR SELECT
USING ((auth.uid() = admin_id) AND has_role(auth.uid(), 'walker'));

CREATE POLICY "Walkers can create affiliations"
ON public.affiliations FOR INSERT
WITH CHECK ((auth.uid() = admin_id) AND has_role(auth.uid(), 'walker'));

CREATE POLICY "Walkers can view their client affiliations"
ON public.affiliations FOR SELECT
USING ((auth.uid() = admin_id) AND has_role(auth.uid(), 'walker'));

-- Políticas de admin_locations
CREATE POLICY "Walkers can insert own locations"
ON public.admin_locations FOR INSERT
WITH CHECK ((auth.uid() = admin_id) AND has_role(auth.uid(), 'walker'));

CREATE POLICY "Walkers can view own locations"
ON public.admin_locations FOR SELECT
USING ((auth.uid() = admin_id) AND has_role(auth.uid(), 'walker'));

CREATE POLICY "Walkers can update own location active status"
ON public.admin_locations FOR UPDATE
USING ((auth.uid() = admin_id) AND has_role(auth.uid(), 'walker'));

-- Políticas de admin_qr_codes
CREATE POLICY "Walkers can view own QR code"
ON public.admin_qr_codes FOR SELECT
USING ((auth.uid() = admin_id) AND has_role(auth.uid(), 'walker'));

CREATE POLICY "Walkers can insert own QR code"
ON public.admin_qr_codes FOR INSERT
WITH CHECK ((auth.uid() = admin_id) AND has_role(auth.uid(), 'walker'));

-- Políticas de user_roles
CREATE POLICY "Walkers can view all roles"
ON public.user_roles FOR SELECT
USING (has_role(auth.uid(), 'walker'));

CREATE POLICY "Walkers can assign roles"
ON public.user_roles FOR INSERT
WITH CHECK (has_role(auth.uid(), 'walker'));

CREATE POLICY "Walkers can update roles"
ON public.user_roles FOR UPDATE
USING (has_role(auth.uid(), 'walker'));

CREATE POLICY "Walkers can revoke roles"
ON public.user_roles FOR DELETE
USING (has_role(auth.uid(), 'walker'));

-- Políticas de profiles
CREATE POLICY "Walkers can view affiliated user profiles"
ON public.profiles FOR SELECT
USING (
  (EXISTS (
    SELECT 1 FROM affiliations
    WHERE affiliations.user_id = profiles.id
    AND affiliations.admin_id = auth.uid()
    AND affiliations.is_active = true
    AND has_role(auth.uid(), 'walker')
  )) OR (auth.uid() = id)
);

-- Políticas de walker_profiles
CREATE POLICY "Walkers can insert own profile"
ON public.walker_profiles FOR INSERT
WITH CHECK ((auth.uid() = user_id) AND has_role(auth.uid(), 'walker'));

CREATE POLICY "Walkers can update own profile"
ON public.walker_profiles FOR UPDATE
USING ((auth.uid() = user_id) AND has_role(auth.uid(), 'walker'));

-- Políticas de walk_requests
CREATE POLICY "Walkers can view requests to them"
ON public.walk_requests FOR SELECT
USING ((auth.uid() = walker_id) AND has_role(auth.uid(), 'walker'));

CREATE POLICY "Walkers can update requests to them"
ON public.walk_requests FOR UPDATE
USING ((auth.uid() = walker_id) AND has_role(auth.uid(), 'walker'));

-- =============================================
-- PASO 9: CREAR TABLAS NUEVAS
-- =============================================

-- Tabla de planes disponibles
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  min_clients INTEGER NOT NULL DEFAULT 0,
  max_clients INTEGER NOT NULL,
  description TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla de asignación de planes a paseadores
CREATE TABLE public.walker_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  walker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(walker_id)
);

-- Insertar los 4 planes predefinidos
INSERT INTO public.subscription_plans (name, display_name, min_clients, max_clients, description, features, sort_order) VALUES
  ('free', 'Gratuito', 0, 6, 'Plan inicial para empezar', '["Hasta 6 clientes", "Tracking básico", "1 grupo"]'::jsonb, 1),
  ('basic', 'Básico', 7, 11, 'Para paseadores en crecimiento', '["Hasta 11 clientes", "Tracking avanzado", "3 grupos", "Estadísticas básicas"]'::jsonb, 2),
  ('premium', 'Premium', 12, 20, 'Para profesionales establecidos', '["Hasta 20 clientes", "Tracking en tiempo real", "10 grupos", "Estadísticas completas"]'::jsonb, 3),
  ('enterprise', 'Empresa', 21, 9999, 'Sin límites prácticos', '["Clientes ilimitados", "Grupos ilimitados", "Soporte prioritario", "Reportes avanzados"]'::jsonb, 4);

-- Tabla de grupos de clientes
CREATE TABLE public.walker_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  walker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla de miembros de grupos
CREATE TABLE public.group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.walker_groups(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(group_id, client_id)
);

-- Tabla para participantes de paseos
CREATE TABLE public.walk_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  walk_id UUID NOT NULL REFERENCES public.walks(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.walker_groups(id) ON DELETE SET NULL,
  can_view_location BOOLEAN DEFAULT true,
  notified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(walk_id, client_id)
);

-- Añadir columna group_id a walks
ALTER TABLE public.walks ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.walker_groups(id) ON DELETE SET NULL;

-- =============================================
-- PASO 10: HABILITAR RLS EN NUEVAS TABLAS
-- =============================================
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.walker_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.walker_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.walk_participants ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PASO 11: POLÍTICAS RLS PARA NUEVAS TABLAS
-- =============================================

-- subscription_plans: Público
CREATE POLICY "Anyone can view active plans"
ON public.subscription_plans FOR SELECT
USING (is_active = true);

-- walker_subscriptions
CREATE POLICY "Walkers can view own subscription"
ON public.walker_subscriptions FOR SELECT
USING (auth.uid() = walker_id);

-- walker_groups
CREATE POLICY "Walkers can view own groups"
ON public.walker_groups FOR SELECT
USING (auth.uid() = walker_id);

CREATE POLICY "Walkers can create own groups"
ON public.walker_groups FOR INSERT
WITH CHECK (auth.uid() = walker_id AND has_role(auth.uid(), 'walker'));

CREATE POLICY "Walkers can update own groups"
ON public.walker_groups FOR UPDATE
USING (auth.uid() = walker_id AND has_role(auth.uid(), 'walker'));

CREATE POLICY "Walkers can delete own groups"
ON public.walker_groups FOR DELETE
USING (auth.uid() = walker_id AND has_role(auth.uid(), 'walker'));

-- group_members
CREATE POLICY "Walkers can view members of own groups"
ON public.group_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.walker_groups 
    WHERE id = group_members.group_id AND walker_id = auth.uid()
  )
);

CREATE POLICY "Walkers can add members to own groups"
ON public.group_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.walker_groups 
    WHERE id = group_members.group_id AND walker_id = auth.uid()
  )
  AND has_role(auth.uid(), 'walker')
);

CREATE POLICY "Walkers can remove members from own groups"
ON public.group_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.walker_groups 
    WHERE id = group_members.group_id AND walker_id = auth.uid()
  )
);

CREATE POLICY "Clients can view own group memberships"
ON public.group_members FOR SELECT
USING (auth.uid() = client_id);

-- walk_participants
CREATE POLICY "Walkers can view participants of own walks"
ON public.walk_participants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.walks 
    WHERE id = walk_participants.walk_id AND walker_id = auth.uid()
  )
);

CREATE POLICY "Walkers can add participants to own walks"
ON public.walk_participants FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.walks 
    WHERE id = walk_participants.walk_id AND walker_id = auth.uid()
  )
);

CREATE POLICY "Walkers can remove participants from own walks"
ON public.walk_participants FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.walks 
    WHERE id = walk_participants.walk_id AND walker_id = auth.uid()
  )
);

CREATE POLICY "Clients can view own walk participations"
ON public.walk_participants FOR SELECT
USING (auth.uid() = client_id);

-- =============================================
-- PASO 12: TRIGGERS
-- =============================================
CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_walker_subscriptions_updated_at
BEFORE UPDATE ON public.walker_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_walker_groups_updated_at
BEFORE UPDATE ON public.walker_groups
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- PASO 13: FUNCIONES HELPER
-- =============================================
CREATE OR REPLACE FUNCTION public.get_walker_client_limit(walker_user_id uuid)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT sp.max_clients 
     FROM public.walker_subscriptions ws
     JOIN public.subscription_plans sp ON ws.plan_id = sp.id
     WHERE ws.walker_id = walker_user_id AND ws.is_active = true
     LIMIT 1),
    6
  );
$$;

CREATE OR REPLACE FUNCTION public.get_walker_client_count(walker_user_id uuid)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.affiliations
  WHERE admin_id = walker_user_id AND is_active = true;
$$;

-- =============================================
-- PASO 14: ASIGNAR PLAN GRATUITO A PASEADORES EXISTENTES
-- =============================================
INSERT INTO public.walker_subscriptions (walker_id, plan_id)
SELECT ur.user_id, sp.id
FROM public.user_roles ur
CROSS JOIN public.subscription_plans sp
WHERE ur.role = 'walker' AND sp.name = 'free'
ON CONFLICT (walker_id) DO NOTHING;

-- =============================================
-- PASO 15: REALTIME
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.walker_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.walk_participants;