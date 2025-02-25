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

    const shouldShowPoll = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const should = !hasShownPoll && 
             !isUnloading && 
             !localStorage.getItem('exitPollCompleted') && 
             !!user;
      
      console.log('[ExitPoll] shouldShowPoll check:', { 
        isAuthenticated: !!user,
        hasShownPoll,
        isUnloading,
        hasCompletedPoll: !!localStorage.getItem('exitPollCompleted'),
        shouldShow: should
      });
      
      return should;
    };

    const showPollSafely = () => {
      console.log('[ExitPoll] Attempting to show poll safely');
      shouldShowPoll().then(should => {
        console.log('[ExitPoll] Should show poll result:', should);
        if (should) {
          console.log('[ExitPoll] Setting hasShownPoll to true');
          hasShownPoll = true;
          console.log('[ExitPoll] Calling setShowPoll(true)');
          setTimeout(() => {
            setShowPoll(true);
            console.log('[ExitPoll] setShowPoll(true) called');
          }, 0);
        }
      });
    };

    const handleVisibilityChange = () => {
      console.log('[ExitPoll] Visibility changed:', document.visibilityState);
      if (document.visibilityState === 'hidden') {
        showPollSafely();
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      console.log('[ExitPoll] Before unload triggered');
      if (!hasShownPoll) {
        isUnloading = true;
        e.preventDefault();
        e.returnValue = '';
        showPollSafely();
      }
    };

    const handleMouseLeave = (e: MouseEvent) => {
      console.log('[ExitPoll] Mouse leave detected:', { y: e.clientY });
      if (e.clientY <= 0) {
        showPollSafely();
      }
    };

    // Add a small delay before attaching listeners
    setTimeout(() => {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('beforeunload', handleBeforeUnload);
      document.addEventListener('mouseleave', handleMouseLeave);
      console.log('[ExitPoll] Event listeners attached');
    }, 1000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('mouseleave', handleMouseLeave);
      console.log('[ExitPoll] Event listeners cleaned up');
    };
  }, [supabase]);

  const handlePollSubmit = async (data: ExitPollData) => {
    try {
      console.log('[ExitPoll] Attempting to submit poll');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('[ExitPoll] No authenticated user, skipping submission');
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
      
      console.log('[ExitPoll] Poll submitted successfully');
      localStorage.setItem('exitPollCompleted', 'true');
      setShowPoll(false);
    } catch (error) {
      console.error('[ExitPoll] Failed to submit poll:', error);
    }
  };

  return {
    showPoll,
    setShowPoll,
    handlePollSubmit
  };
}; 