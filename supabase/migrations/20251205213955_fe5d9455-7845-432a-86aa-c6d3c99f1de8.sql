-- Tabla 1: Perfil de paseadores disponibles (configuración de servicio)
CREATE TABLE public.walker_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_available BOOLEAN DEFAULT true,
  service_radius INTEGER DEFAULT 10, -- en km
  hourly_rate DECIMAL(10,2),
  specialties TEXT[], -- array de especialidades
  bio TEXT,
  city TEXT,
  state TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Tabla 2: Solicitudes de servicio
CREATE TABLE public.walk_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  walker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_date DATE NOT NULL,
  requested_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  number_of_dogs INTEGER DEFAULT 1,
  special_notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'completed')),
  response_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE public.walker_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.walk_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for walker_profiles

-- Anyone authenticated can view available walker profiles (for discovery)
CREATE POLICY "Anyone can view available walkers"
ON public.walker_profiles
FOR SELECT
USING (is_available = true);

-- Walkers can view their own profile regardless of availability
CREATE POLICY "Walkers can view own profile"
ON public.walker_profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Only walkers (admins) can insert their own profile
CREATE POLICY "Walkers can insert own profile"
ON public.walker_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id AND has_role(auth.uid(), 'admin'::app_role));

-- Walkers can update their own profile
CREATE POLICY "Walkers can update own profile"
ON public.walker_profiles
FOR UPDATE
USING (auth.uid() = user_id AND has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for walk_requests

-- Clients can view their own requests
CREATE POLICY "Clients can view own requests"
ON public.walk_requests
FOR SELECT
USING (auth.uid() = client_id);

-- Walkers can view requests sent to them
CREATE POLICY "Walkers can view requests to them"
ON public.walk_requests
FOR SELECT
USING (auth.uid() = walker_id AND has_role(auth.uid(), 'admin'::app_role));

-- Clients can create requests
CREATE POLICY "Clients can create requests"
ON public.walk_requests
FOR INSERT
WITH CHECK (auth.uid() = client_id);

-- Clients can update their own requests (cancel)
CREATE POLICY "Clients can update own requests"
ON public.walk_requests
FOR UPDATE
USING (auth.uid() = client_id);

-- Walkers can update requests to them (accept/reject)
CREATE POLICY "Walkers can update requests to them"
ON public.walk_requests
FOR UPDATE
USING (auth.uid() = walker_id AND has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at on walker_profiles
CREATE TRIGGER update_walker_profiles_updated_at
BEFORE UPDATE ON public.walker_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Trigger for updated_at on walk_requests
CREATE TRIGGER update_walk_requests_updated_at
BEFORE UPDATE ON public.walk_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime for walk_requests (for notifications)
ALTER TABLE public.walk_requests REPLICA IDENTITY FULL;