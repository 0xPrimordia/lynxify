"use client";

import { useState, useEffect } from 'react';
import { Button } from '@nextui-org/react';

interface ExitPollProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedback: ExitPollData) => void;
}

export interface ExitPollData {
  rating: number;
  feedback: string;
  usageType: 'swap' | 'stake' | 'governance' | 'other';
  willReturn: boolean;
}

export function ExitPoll({ isOpen, onClose, onSubmit }: ExitPollProps) {
  const [formData, setFormData] = useState<ExitPollData>({
    rating: 0,
    feedback: '',
    usageType: 'other',
    willReturn: true
  });
  const [isTestnet, setIsTestnet] = useState(false);

  useEffect(() => {
    // Check if we're on testnet
    setIsTestnet(process.env.NEXT_PUBLIC_HEDERA_NETWORK === 'testnet');
  }, []);

  // Don't render the poll on testnet or if it's not open
  if (isTestnet || !isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-xl max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Quick Feedback</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block mb-2">How would you rate your experience?</label>
            <div className="flex space-x-2">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  onClick={() => setFormData({ ...formData, rating: num })}
                  className={`p-2 rounded ${
                    formData.rating === num ? 'bg-blue-600' : 'bg-gray-700'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block mb-2">Any additional feedback?</label>
            <textarea
              value={formData.feedback}
              onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
              className="w-full p-2 bg-gray-700 rounded"
              rows={3}
            />
          </div>

          <div className="flex justify-between">
            <Button color="danger" variant="light" onPress={onClose}>
              Skip
            </Button>
            <Button color="primary" onPress={() => onSubmit(formData)}>
              Submit Feedback
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 