-- Add role management policies for user_roles table
-- This allows admins to assign and manage user roles

-- Policy for admins to insert new roles
CREATE POLICY "Admins can assign roles"
ON public.user_roles
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Policy for admins to update existing roles
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy for admins to delete roles
CREATE POLICY "Admins can revoke roles"
ON public.user_roles
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));