-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
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

-- Create affiliations table for tracking which users are affiliated to which admins
CREATE TABLE public.affiliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  affiliated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE (user_id, admin_id)
);

-- Enable RLS on affiliations
ALTER TABLE public.affiliations ENABLE ROW LEVEL SECURITY;

-- Users can view their own affiliations
CREATE POLICY "Users can view own affiliations"
ON public.affiliations
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view affiliations to them
CREATE POLICY "Admins can view their affiliations"
ON public.affiliations
FOR SELECT
USING (auth.uid() = admin_id AND public.has_role(auth.uid(), 'admin'));

-- Create admin_locations table for real-time tracking
CREATE TABLE public.admin_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on admin_locations
ALTER TABLE public.admin_locations ENABLE ROW LEVEL SECURITY;

-- Admins can insert their own locations
CREATE POLICY "Admins can insert own locations"
ON public.admin_locations
FOR INSERT
WITH CHECK (auth.uid() = admin_id AND public.has_role(auth.uid(), 'admin'));

-- Affiliated users can view admin locations
CREATE POLICY "Affiliated users can view admin locations"
ON public.admin_locations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.affiliations
    WHERE affiliations.user_id = auth.uid()
    AND affiliations.admin_id = admin_locations.admin_id
    AND affiliations.is_active = TRUE
  )
);

-- Admins can view their own locations
CREATE POLICY "Admins can view own locations"
ON public.admin_locations
FOR SELECT
USING (auth.uid() = admin_id AND public.has_role(auth.uid(), 'admin'));

-- Modify qr_codes table to support affiliation codes
ALTER TABLE public.qr_codes ADD COLUMN IF NOT EXISTS code_type TEXT DEFAULT 'walk';
ALTER TABLE public.qr_codes ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update RLS policy for affiliation codes
CREATE POLICY "Users can scan affiliation codes"
ON public.qr_codes
FOR SELECT
USING (code_type = 'affiliation' AND is_active = TRUE);

-- Enable realtime for admin_locations
ALTER PUBLICATION supabase_realtime ADD TABLE admin_locations;