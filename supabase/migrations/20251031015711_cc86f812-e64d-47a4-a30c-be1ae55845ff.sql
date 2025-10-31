-- Add completed walks counter to profiles table
ALTER TABLE public.profiles
ADD COLUMN completed_walks_count INTEGER DEFAULT 0;

-- Create function to clean admin locations when walk ends
CREATE OR REPLACE FUNCTION clean_admin_locations_on_walk_end()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If walk status changed to completed, clean admin locations
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    DELETE FROM public.admin_locations
    WHERE admin_id = NEW.walker_id
    AND is_active = true;
    
    -- Increment completed walks count for walker
    UPDATE public.profiles
    SET completed_walks_count = completed_walks_count + 1
    WHERE id = NEW.walker_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for walk completion
DROP TRIGGER IF EXISTS on_walk_completed ON public.walks;
CREATE TRIGGER on_walk_completed
  AFTER UPDATE ON public.walks
  FOR EACH ROW
  EXECUTE FUNCTION clean_admin_locations_on_walk_end();