import { useState, useEffect, useCallback } from 'react';
import { TESTNET_REWARDS } from '@/config/rewards';
import { UserAchievement } from '@/app/types';
import { supabase } from '@/utils/supabase';

export const useRewards = (userId?: string, account?: string) => {
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);

  const isInitializing = isLoading && !hasAttemptedLoad;

  const fetchAchievements = useCallback(async () => {
    if (!userId || !account) return;

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('userachievements')
        .select('*')
        .eq('user_id', userId)
        .eq('hedera_account_id', account);

      if (error) throw error;

      setAchievements(data || []);
      setHasAttemptedLoad(true);
    } catch (error) {
      console.error('Error in fetchAchievements:', error);
      setAchievements([]);
      setHasAttemptedLoad(true);
    } finally {
      setIsLoading(false);
    }
  }, [userId, account, supabase]);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  const awardXP = useCallback(async (taskId: keyof typeof TESTNET_REWARDS.TASKS) => {
    if (!userId || !account) return;

    try {
        // First check if achievement already exists
        const { data: existingAchievement } = await supabase
            .from('userachievements')
            .select('*')
            .eq('user_id', userId)
            .eq('task_id', taskId)
            .single();

        if (existingAchievement) {
            console.debug(`Achievement ${taskId} already earned`); // Changed to debug level
            return;
        }

        const { error } = await supabase
            .from('userachievements')
            .insert({
                user_id: userId,
                hedera_account_id: account,
                task_id: taskId,
                xp_awarded: TESTNET_REWARDS.TASKS[taskId].xp
            });

        if (error) throw error;

        // Refresh achievements after successful insert
        await fetchAchievements();
    } catch (error) {
        console.error('Error awarding XP:', error);
    }
  }, [userId, account, fetchAchievements]);

  return { 
    achievements, 
    isLoading, 
    awardXP,
    hasAttemptedLoad,
    isInitializing 
  };
}; 