"use client";

import { ExitPoll } from './ExitPoll';
import { useExitPoll } from '../hooks/useExitPoll';

export function ExitPollWrapper() {
  const { showPoll, setShowPoll, handlePollSubmit } = useExitPoll();

  return (
    <ExitPoll 
      isOpen={showPoll}
      onClose={() => setShowPoll(false)}
      onSubmit={handlePollSubmit}
    />
  );
} 