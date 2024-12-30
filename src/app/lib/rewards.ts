import { createServerSupabase } from '@/utils/supabase';
import { TESTNET_REWARDS } from '@/config/rewards';
import { cookies } from 'next/headers';
import { UserAchievement } from '@/app/types';

export async function awardThresholdExecutionXP(userId: string, hederaAccountId: string) {
    const cookieStore = cookies();
    const supabase = createServerSupabase(cookieStore, true);

    try {
        const achievement: Omit<UserAchievement, 'id' | 'created_at' | 'completed_at'> = {
            user_id: userId,
            hedera_account_id: hederaAccountId,
            task_id: 'EXECUTE_THRESHOLD',
            xp_awarded: TESTNET_REWARDS.TASKS.EXECUTE_THRESHOLD.xp
        };

        const { error } = await supabase
            .from('userachievements')
            .insert(achievement);

        if (error && error.code !== '23505') { // Ignore duplicate error
            throw error;
        }
    } catch (error) {
        console.error('Error awarding threshold execution XP:', error);
        // Don't throw - we don't want XP issues to affect core functionality
    }
} 