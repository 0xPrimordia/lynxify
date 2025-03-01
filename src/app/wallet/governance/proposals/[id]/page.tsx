import GovernanceNav from '@/app/components/GovernanceNav';
import TestnetAlert from '@/app/components/TestnetAlert';

export default function ProposalDetailPage() {
  // ... existing state and hooks ...

  return (
    <div className="w-full">
      <TestnetAlert />
      <GovernanceNav currentSection="proposals" />
      {/* ... rest of the component ... */}
    </div>
  );
} 