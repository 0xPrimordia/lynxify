import { useState, useEffect, useCallback } from 'react';
import { TESTNET_REWARDS } from '@/config/rewards';
import { UserAchievement } from '@/app/types';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export const useRewards = (userId?: string, account?: string) => {
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
  const supabase = createClientComponentClient();

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
      const task = TESTNET_REWARDS.TASKS[taskId];
      if (!task) {
        console.error(`Invalid task ID: ${taskId}`);
        return;
      }

      const { data, error } = await supabase
        .from('userachievements')
        .insert({
          user_id: userId,
          hedera_account_id: account,
          task_id: taskId,
          xp_awarded: task.xp
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          console.log(`Achievement ${taskId} already earned`);
          return;
        }
        throw error;
      }

      setAchievements(prev => [...prev, data]);
      return data;
    } catch (error) {
      console.error(`Error awarding XP for task ${taskId}:`, error);
      throw error;
    }
  }, [userId, account, supabase]);

  return { 
    achievements, 
    isLoading, 
    awardXP,
    hasAttemptedLoad,
    isInitializing 
  };
}; 