// hooks/useTokenPriceHistory.js
import { useState, useEffect } from 'react';
import { PriceHistory } from '../types';

const useTokenPriceHistory = (tokenId:string, from:number, to:number, interval:string) => {
  const [data, setData] = useState<PriceHistory[]|null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!tokenId || !from || !to) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/saucerswap/tokens/prices/${tokenId}?from=${from}&to=${to}&interval=${interval}`);
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        const result = await response.json();
        setData(result);
      } catch (err:any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tokenId, from, to, interval]);

  return { data, loading, error };
};

export default useTokenPriceHistory;
