"use client";
import { useState, useEffect } from 'react';
import { Threshold } from '@/app/types';
import { supabase } from '@/utils/supabase';

const Thresholds = () => {
    const [thresholds, setThresholds] = useState<Threshold[]>([]);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        const fetchUserId = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUserId(session.user.id);
            }
        };
        fetchUserId();
    }, [supabase]);

    useEffect(() => {
        const fetchThresholds = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user?.id) return;
            
            const response = await fetch(`/api/thresholds?userId=${session.user.id}`);
            const data = await response.json();
            if (response.ok) {
                setThresholds(data);
            } else {
                console.error('Error fetching thresholds:', data.error);
            }
        };
        
        fetchThresholds();
    }, []);

    return (
        <div>
            <h1>Thresholds</h1>
            {thresholds.map((threshold) => (
                <div key={threshold.id}>
                    <p>{threshold.type}</p>
                    <p>{threshold.price}</p>
                    <p>{threshold.cap}</p>
                    <p>{threshold.hederaAccountId}</p>
                    <p>{threshold.tokenA}</p>
                    <p>{threshold.tokenB}</p>
                </div>
            ))}
        </div>
    );
};

export default Thresholds;