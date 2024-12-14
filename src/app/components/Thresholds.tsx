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