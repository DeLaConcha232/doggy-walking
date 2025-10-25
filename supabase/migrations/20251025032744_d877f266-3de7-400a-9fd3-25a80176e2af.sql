-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for walk status
CREATE TYPE walk_status AS ENUM ('pending', 'active', 'completed', 'cancelled');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create walks table
CREATE TABLE public.walks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  walker_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  dog_name TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  status walk_status DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on walks
ALTER TABLE public.walks ENABLE ROW LEVEL SECURITY;

-- Walks policies
CREATE POLICY "Users can view own walks"
  ON public.walks FOR SELECT
  USING (auth.uid() = client_id OR auth.uid() = walker_id);

CREATE POLICY "Clients can create walks"
  ON public.walks FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Users can update own walks"
  ON public.walks FOR UPDATE
  USING (auth.uid() = client_id OR auth.uid() = walker_id);

-- Create locations table
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  walk_id UUID REFERENCES public.walks(id) ON DELETE CASCADE NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on locations
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Locations policies
CREATE POLICY "Users can view locations for their walks"
  ON public.locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.walks
      WHERE walks.id = locations.walk_id
      AND (walks.client_id = auth.uid() OR walks.walker_id = auth.uid())
    )
  );

CREATE POLICY "Walkers can insert locations"
  ON public.locations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.walks
      WHERE walks.id = walk_id
      AND walks.walker_id = auth.uid()
    )
  );

-- Create QR codes table
CREATE TABLE public.qr_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  walk_id UUID REFERENCES public.walks(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on qr_codes
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;

-- QR codes policies
CREATE POLICY "Users can view active QR codes"
  ON public.qr_codes FOR SELECT
  USING (is_active = true);

CREATE POLICY "Walkers can create QR codes"
  ON public.qr_codes FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, phone)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', ''),
    COALESCE(new.raw_user_meta_data->>'phone', '')
  );
  RETURN new;
END;
$$;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_walks_updated_at
  BEFORE UPDATE ON public.walks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime for locations table
ALTER PUBLICATION supabase_realtime ADD TABLE public.locations;

-- Add replica identity for realtime updates
ALTER TABLE public.locations REPLICA IDENTITY FULL;