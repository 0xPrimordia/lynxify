import { useRewards } from '../hooks/useRewards';
import { TESTNET_REWARDS } from '@/config/rewards';

export default function UserProgress({ userId, accountId }: { userId: string; accountId: string }) {
  const { achievements, isLoading } = useRewards(userId, accountId);

  const getCurrentLevel = (xp: number) => {
    return Object.entries(TESTNET_REWARDS.LEVELS)
      .reverse()
      .find(([level, requiredXp]) => xp >= requiredXp)?.[0] || '1';
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="p-4 rounded-lg bg-white shadow-md">
      <h2 className="text-xl font-bold mb-4">Testnet Progress</h2>
      <div className="mb-4">
        <p>Level: {getCurrentLevel(achievements?.total_xp || 0)}</p>
        <p>Total XP: {achievements?.total_xp || 0}</p>
      </div>
      <div className="space-y-2">
        {Object.entries(TESTNET_REWARDS.TASKS).map(([taskId, task]) => (
          <div key={taskId} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!achievements?.completed_tasks?.[taskId]}
              readOnly
            />
            <span>{task.description} (+{task.xp} XP)</span>
          </div>
        ))}
      </div>
    </div>
  );
} 