import dotenv from 'dotenv';
import { validateTestEnvironment, setupTestClient, supabase } from './helpers/setup';
import { authenticateWallet } from './helpers/auth';
import { TESTNET_REWARDS } from '../../config/rewards';

async function main() {
    await validateTestEnvironment();
    const { client, operatorId, operatorKey } = setupTestClient();

    try {
        const session = await authenticateWallet(operatorId, operatorKey);

        // Test awarding XP for each task type
        for (const [taskId, task] of Object.entries(TESTNET_REWARDS.TASKS)) {
            console.log(`\nTesting XP award for task: ${taskId}`);
            
            const { data, error } = await supabase
                .from('UserAchievements')
                .upsert({
                    user_id: session.user.id,
                    hedera_account_id: operatorId.toString(),
                    total_xp: task.xp,
                    completed_tasks: {
                        [taskId]: {
                            completed_at: new Date().toISOString(),
                            xp_awarded: task.xp
                        }
                    }
                })
                .select()
                .single();

            if (error) {
                console.error(`Failed to award XP for ${taskId}:`, error);
            } else {
                console.log(`Successfully awarded ${task.xp} XP for ${taskId}`);
            }
        }

    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
