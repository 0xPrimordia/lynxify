"use client";

import { useState, useEffect } from 'react';
import { useSupabase } from './useSupabase';
import type { ExitPollData } from '../components/ExitPoll';

export const useExitPoll = () => {
  const [showPoll, setShowPoll] = useState(false);
  const { supabase } = useSupabase();

  useEffect(() => {
    let hasShownPoll = false;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && !hasShownPoll && !localStorage.getItem('exitPollCompleted')) {
        hasShownPoll = true;
        setShowPoll(true);
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasShownPoll && !localStorage.getItem('exitPollCompleted')) {
        hasShownPoll = true;
        setShowPoll(true);
        e.preventDefault();
        e.returnValue = '';
      }
    };

    // Track mouse leaving the window
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !hasShownPoll && !localStorage.getItem('exitPollCompleted')) {
        hasShownPoll = true;
        setShowPoll(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const handlePollSubmit = async (data: ExitPollData) => {
    try {
      await supabase.from('exit_polls').insert([{
        ...data,
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