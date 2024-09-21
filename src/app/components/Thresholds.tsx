"use client";
import { useState, useEffect } from 'react';
import { Threshold } from '@/app/types';

const Thresholds = () => {
    const [thresholds, setThresholds] = useState<Threshold[]>([]);

    useEffect(() => {
        const fetchThresholds = async () => {
            const response = await fetch('/api/thresholds');
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
                    <p>{threshold.stop_loss}</p>
                    <p>{threshold.buy_order}</p>
                    <p>{threshold.stop_loss_cap}</p>
                    <p>{threshold.buy_order_cap}</p>
                    <p>{threshold.hedera_account_id}</p>
                    <p>{threshold.token_id}</p>
                </div>
            ))}
        </div>
    );
};

export default Thresholds;