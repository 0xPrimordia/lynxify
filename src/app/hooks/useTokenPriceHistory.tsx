// hooks/useTokenPriceHistory.js
import { useState, useEffect, useRef } from 'react';
import { PriceHistory } from '../types';

const useTokenPriceHistory = (tokenId: string, from: number, to: number, interval: string) => {
    const [data, setData] = useState<PriceHistory[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const previousDataRef = useRef<PriceHistory[] | null>(null);

    useEffect(() => {
        if (!tokenId || !from || !to) return;

        let isMounted = true;

        const fetchData = async () => {
            if (!isMounted) return;
            
            // Keep showing previous data while loading
            setLoading(true);
            setError(null);

            try {
                const response = await fetch(`/api/saucerswap/tokens/prices/${tokenId}?from=${from}&to=${to}&interval=${interval}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch data');
                }
                const result = await response.json();
                if (isMounted) {
                    setData(result);
                    previousDataRef.current = result;
                }
            } catch (err: any) {
                if (isMounted) {
                    setError(err.message);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchData();

        return () => {
            isMounted = false;
        };
    }, [tokenId, from, to, interval]);

    return { 
        data: loading ? previousDataRef.current : data, 
        loading, 
        error 
    };
};

export default useTokenPriceHistory;
