import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { TESTNET_REWARDS } from '@/config/rewards';
import { UserAchievement } from '@/app/types';

const supabase = createClientComponentClient();

export function useRewards(userId: string | undefined, hederaAccountId: string | undefined) {
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAchievements() {
      if (!userId || !hederaAccountId) return;

      const { data, error } = await supabase
        .from('userachievements')
        .select('*')
        .eq('user_id', userId)
        .eq('hedera_account_id', hederaAccountId);

      if (error) {
        console.error('Error fetching achievements:', error);
        return;
      }

      setAchievements(data || []);
      setIsLoading(false);
    }

    fetchAchievements();
  }, [userId, hederaAccountId]);

  const awardXP = useCallback(async (taskId: keyof typeof TESTNET_REWARDS.TASKS) => {
    if (!userId || !hederaAccountId) return;

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
          hedera_account_id: hederaAccountId,
          task_id: taskId,
          xp_awarded: task.xp
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique violation
          console.log(`Achievement ${taskId} already earned`);
          return;
        }
        throw error;
      }

      setAchievements([...achievements, data]);
      return data;
    } catch (error) {
      console.error(`Error awarding XP for task ${taskId}:`, error);
      throw error;
    }
  }, [userId, hederaAccountId, achievements]);

  return { achievements, isLoading, awardXP };
} 