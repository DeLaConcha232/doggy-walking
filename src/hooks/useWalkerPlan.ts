import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PlanInfo {
  id: string;
  name: string;
  displayName: string;
  maxClients: number;
  features: string[];
}

interface UseWalkerPlanReturn {
  plan: PlanInfo | null;
  clientCount: number;
  clientLimit: number;
  loading: boolean;
  isAtLimit: boolean;
  isNearLimit: boolean;
  remainingSlots: number;
  refresh: () => Promise<void>;
}

export const useWalkerPlan = (walkerId: string | undefined): UseWalkerPlanReturn => {
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [clientCount, setClientCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchPlanData = useCallback(async () => {
    if (!walkerId) {
      setLoading(false);
      return;
    }

    try {
      // Get walker's subscription with plan details
      const { data: subscription, error: subError } = await supabase
        .from('walker_subscriptions')
        .select(`
          plan_id,
          subscription_plans (
            id,
            name,
            display_name,
            max_clients,
            features
          )
        `)
        .eq('walker_id', walkerId)
        .eq('is_active', true)
        .maybeSingle();

      if (subError) {
        console.error('Error fetching subscription:', subError);
      }

      // Get current client count
      const { data: affiliations, error: affError } = await supabase
        .from('affiliations')
        .select('id')
        .eq('admin_id', walkerId)
        .eq('is_active', true);

      if (affError) {
        console.error('Error fetching affiliations:', affError);
      }

      const count = affiliations?.length || 0;
      setClientCount(count);

      if (subscription?.subscription_plans) {
        const planData = subscription.subscription_plans as {
          id: string;
          name: string;
          display_name: string;
          max_clients: number;
          features: string[];
        };
        setPlan({
          id: planData.id,
          name: planData.name,
          displayName: planData.display_name,
          maxClients: planData.max_clients,
          features: planData.features || []
        });
      } else {
        // Default to free plan if no subscription
        setPlan({
          id: 'default',
          name: 'free',
          displayName: 'Gratuito',
          maxClients: 6,
          features: ['Hasta 6 clientes', 'Tracking básico', '1 grupo']
        });
      }
    } catch (err) {
      console.error('Error in useWalkerPlan:', err);
    } finally {
      setLoading(false);
    }
  }, [walkerId]);

  useEffect(() => {
    fetchPlanData();
  }, [fetchPlanData]);

  const clientLimit = plan?.maxClients || 6;
  const isAtLimit = clientCount >= clientLimit;
  const isNearLimit = clientCount >= clientLimit - 1;
  const remainingSlots = Math.max(0, clientLimit - clientCount);

  return {
    plan,
    clientCount,
    clientLimit,
    loading,
    isAtLimit,
    isNearLimit,
    remainingSlots,
    refresh: fetchPlanData
  };
};
