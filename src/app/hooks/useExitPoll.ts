"use client";

import { useState, useEffect } from 'react';
import { useSupabase } from './useSupabase';
import type { ExitPollData } from '../components/ExitPoll';

export const useExitPoll = () => {
  const [showPoll, setShowPoll] = useState(false);
  const { supabase } = useSupabase();

  useEffect(() => {
    // Ensure we're in a browser environment
    if (typeof window === 'undefined') return;

    let hasShownPoll = false;
    let isUnloading = false;

    const shouldShowPoll = () => {
      return !hasShownPoll && 
             !isUnloading && 
             !localStorage.getItem('exitPollCompleted') && 
             typeof window !== 'undefined';
    };

    const showPollSafely = () => {
      if (shouldShowPoll()) {
        hasShownPoll = true;
        // Use setTimeout to ensure state updates in production
        setTimeout(() => setShowPoll(true), 0);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        showPollSafely();
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (shouldShowPoll()) {
        isUnloading = true;
        e.preventDefault();
        e.returnValue = '';
        showPollSafely();
      }
    };

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        showPollSafely();
      }
    };

    // Add a small delay before attaching listeners
    setTimeout(() => {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('beforeunload', handleBeforeUnload);
      document.addEventListener('mouseleave', handleMouseLeave);
    }, 1000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const handlePollSubmit = async (data: ExitPollData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from('exit_polls').insert([{
        rating: data.rating,
        feedback: data.feedback,
        usage_type: data.usageType,
        will_return: data.willReturn,
        user_id: user?.id || null,
        submitted_at: new Date().toISOString()
      }]);
      
      localStorage.setItem('exitPollCompleted', 'true');
      setShowPoll(false);
    } catch (error) {
      console.error('Failed to submit exit poll:', error);
    }
  };

  return {
    showPoll,
    setShowPoll,
    handlePollSubmit
  };
}; 