// src/components/governance/DaoTestControls.tsx
import { useState, useEffect } from 'react';

interface DaoTestControlsProps {
  onPreferenceSubmit: (topicId: string) => void;
}

export default function DaoTestControls({ onPreferenceSubmit }: DaoTestControlsProps) {
  const [showControls, setShowControls] = useState(false);
  const [userTopicId, setUserTopicId] = useState<string | null>(null);
  const [userId, setUserId] = useState('0.0.12345'); // Mock user ID
  const [lynxStake, setLynxStake] = useState(1000); // Mock LYNX stake
  
  useEffect(() => {
    // Check for existing topic ID in localStorage
    const savedTopicId = localStorage.getItem('lynx-user-topic-id');
    if (savedTopicId) {
      setUserTopicId(savedTopicId);
    }
  }, []);
  
  const createUserTopic = async () => {
    try {
      const result = await fetch('/api/governance/create-user-topic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          publicKey: 'mock-public-key', // In a real app, this would come from the wallet
          lynxStake
        }),
      });
      
      const data = await result.json();
      if (data.success && data.topicId) {
        setUserTopicId(data.topicId);
        localStorage.setItem('lynx-user-topic-id', data.topicId);
        alert(`User topic created with ID: ${data.topicId}`);
      }
    } catch (error) {
      console.error('Error creating user topic:', error);
      alert('Failed to create user topic');
    }
  };
  
  if (!showControls) {
    return (
      <button
        onClick={() => setShowControls(true)}
        className="text-sm text-gray-400 hover:text-white"
      >
        Show DAO Testing Controls
      </button>
    );
  }
  
  return (
    <div className="mb-8 p-4 border border-blue-500 bg-blue-900/30 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-white">DAO Testing Controls</h3>
        <button
          onClick={() => setShowControls(false)}
          className="text-sm text-gray-400 hover:text-white"
        >
          Hide
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            User ID (Hedera Account)
          </label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            LYNX Stake Amount
          </label>
          <input
            type="number"
            value={lynxStake}
            onChange={(e) => setLynxStake(Number(e.target.value))}
            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white"
          />
        </div>
      </div>
      
      {!userTopicId ? (
        <button
          onClick={createUserTopic}
          className="bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Create User Topic
        </button>
      ) : (
        <div>
          <div className="flex items-center mb-4">
            <span className="text-gray-300 mr-2">User Topic ID:</span>
            <code className="bg-gray-800 px-2 py-1 rounded text-green-400">{userTopicId}</code>
          </div>
          
          <div className="flex space-x-4">
            <button
              onClick={() => onPreferenceSubmit(userTopicId)}
              className="bg-green-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
            >
              Submit Preference
            </button>
            
            <button
              onClick={() => {
                localStorage.removeItem('lynx-user-topic-id');
                setUserTopicId(null);
              }}
              className="bg-red-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
            >
              Reset Topic
            </button>
          </div>
        </div>
      )}
    </div>
  );
}