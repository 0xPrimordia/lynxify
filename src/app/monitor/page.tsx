'use client';
import { Threshold } from '@/app/types';
import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';

export default function MonitorPage() {
  const [thresholds, setThresholds] = useState<Threshold[]>([]);

  useEffect(() => {
    const fetchThresholds = async () => {
      const { data } = await supabase
        .from('Thresholds')
        .select('*')
        .order('created_at', { ascending: false });
      setThresholds(data || []);
    };

    fetchThresholds();
    const interval = setInterval(fetchThresholds, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl mb-4">Threshold Monitor</h1>
      <table className="w-full">
        <thead>
          <tr>
            <th>ID</th>
            <th>Status</th>
            <th>Stop Loss</th>
            <th>Buy Order</th>
            <th>Last Checked</th>
            <th>Last Error</th>
          </tr>
        </thead>
        <tbody>
          {thresholds.map((threshold: Threshold) => (
            <tr key={threshold.id}>
              <td>{threshold.id}</td>
              <td>{threshold.status}</td>
              <td>${threshold.price}</td>
              <td>${threshold.cap}</td>
              <td>{threshold.type}</td>
              <td>{new Date(threshold.lastChecked).toLocaleString()}</td>
              <td>{threshold.lastError}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 