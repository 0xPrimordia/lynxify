import { useState, useCallback } from 'react';
import { supabase } from '@/utils/supabase';
import { TESTNET_REWARDS } from '@/config/rewards';
import { UserAchievement } from '../types';

export const useRewards = () => {
  const [state, setState] = useState({
    achievements: [] as UserAchievement[],
    totalXP: 0,
    error: null as Error | null,
    isLoading: false
  });

  const fetchAchievements = useCallback(async (userId: string, account: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const { data, error } = await supabase
        .from('userachievements')
        .select('*')
        .eq('hedera_account_id', account);

      if (error) throw error;

      const validAchievements = data?.filter(achievement => 
        achievement.user_id === userId || achievement.task_id === 'EXECUTE_THRESHOLD'
      ) || [];

      const totalXP = validAchievements.reduce((sum, achievement) => 
        sum + (achievement.xp_awarded || 0), 0) || 0;

      setState({
        achievements: validAchievements,
        totalXP,
        error: null,
        isLoading: false
      });

      return totalXP;
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
      setState(prev => ({ 
        ...prev, 
        error: error as Error,
        isLoading: false 
      }));
      return 0;
    }
  }, []);

  const awardXP = useCallback(async (
    userId: string, 
    account: string, 
    taskId: keyof typeof TESTNET_REWARDS.TASKS
  ) => {
    try {
      const { data: existingAchievement } = await supabase
        .from('userachievements')
        .select('*')
        .eq('user_id', userId)
        .eq('task_id', taskId)
        .single();

      if (existingAchievement) return;

      const xpToAward = TESTNET_REWARDS.TASKS[taskId].xp;
      
      const { error } = await supabase
        .from('userachievements')
        .insert({
          user_id: userId,
          hedera_account_id: account,
          task_id: taskId,
          xp_awarded: xpToAward
        });

      if (error) throw error;

      setState(prev => ({
        ...prev,
        totalXP: prev.totalXP + xpToAward
      }));

      await fetchAchievements(userId, account);
    } catch (error) {
      console.error('Failed to award XP:', error);
    }
  }, [fetchAchievements]);

  return {
    ...state,
    fetchAchievements,
    awardXP
  };
}; 