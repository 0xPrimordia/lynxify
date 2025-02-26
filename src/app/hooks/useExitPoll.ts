"use client";

import { useState, useEffect } from 'react';
import { useSupabase } from './useSupabase';
import type { ExitPollData } from '../components/ExitPoll';

export const useExitPoll = () => {
  const [showPoll, setShowPoll] = useState(false);
  const { supabase } = useSupabase();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let hasShownPoll = false;
    let isUnloading = false;

    const shouldShowPoll = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return !hasShownPoll && 
             !isUnloading && 
             !localStorage.getItem('exitPollCompleted') && 
             !!user;
    };

    const showPollSafely = async () => {
      const should = await shouldShowPoll();
      if (should) {
        hasShownPoll = true;
        setShowPoll(true);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        showPollSafely();
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasShownPoll) {
        isUnloading = true;
        showPollSafely();
      }
    };

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        showPollSafely();
      }
    };

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
  }, [supabase]);

  const handlePollSubmit = async (data: ExitPollData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setShowPoll(false);
        return;
      }

      await supabase.from('exit_polls').insert([{
        rating: data.rating,
        feedback: data.feedback,
        usage_type: data.usageType,
        will_return: data.willReturn,
        user_id: user.id,
        submitted_at: new Date().toISOString()
      }]);
      
      localStorage.setItem('exitPollCompleted', 'true');
      setShowPoll(false);
    } catch (error) {
      // Silent fail - don't want to interrupt user experience for analytics
      setShowPoll(false);
    }
  };

  return {
    showPoll,
    setShowPoll,
    handlePollSubmit
  };
}; 