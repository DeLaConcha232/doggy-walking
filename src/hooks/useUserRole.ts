import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

export type AppRole = 'admin' | 'user' | 'moderator';

interface UseUserRoleReturn {
  user: User | null;
  role: AppRole | null;
  isAdmin: boolean;
  isWalker: boolean;
  loading: boolean;
  checkRole: () => Promise<void>;
}

export const useUserRole = (): UseUserRoleReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const checkRole = useCallback(async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }

      setUser(currentUser);

      // Check user role from user_roles table
      const { data: roleData, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching role:', error);
        setRole('user'); // Default to user if error
      } else if (roleData) {
        setRole(roleData.role as AppRole);
      } else {
        setRole('user'); // Default to user if no role found
      }
    } catch (err) {
      console.error('Error in checkRole:', err);
      setRole('user');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
        setRole(null);
        setLoading(false);
      } else if (event === 'SIGNED_IN') {
        checkRole();
      }
    });

    return () => subscription.unsubscribe();
  }, [checkRole]);

  return {
    user,
    role,
    isAdmin: role === 'admin',
    isWalker: role === 'admin', // In this system, admins are walkers
    loading,
    checkRole
  };
};
