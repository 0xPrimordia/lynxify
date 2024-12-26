import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { TESTNET_REWARDS } from '@/config/rewards';
import { UserAchievements } from '@/app/types';

export function useRewards(userId: string | undefined, hederaAccountId: string | undefined) {
  const [achievements, setAchievements] = useState<UserAchievements | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClientComponentClient();

  const awardXP = async (taskId: string) => {
    if (!userId || !hederaAccountId) return;

    try {
      const task = TESTNET_REWARDS.TASKS[taskId as keyof typeof TESTNET_REWARDS.TASKS];
      if (!task) return;

      // Check if task is already completed
      if (achievements?.completed_tasks?.[taskId]) {
        console.log(`Task ${taskId} already completed`);
        return achievements;
      }

      const { data, error } = await supabase
        .from('UserAchievements')
        .upsert({
          user_id: userId,
          hedera_account_id: hederaAccountId,
          total_xp: (achievements?.total_xp || 0) + task.xp,
          completed_tasks: {
            ...(achievements?.completed_tasks || {}),
            [taskId]: {
              completed_at: new Date().toISOString(),
              xp_awarded: task.xp
            }
          }
        })
        .select()
        .single();

      if (error) throw error;
      setAchievements(data);
      
      return data;
    } catch (error) {
      console.error('Error awarding XP:', error);
    }
  };

  // Add this to existing components where needed
  return { achievements, isLoading, awardXP };
} 