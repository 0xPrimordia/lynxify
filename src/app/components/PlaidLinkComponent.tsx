"use client"
import { useState, useEffect } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import axios from 'axios';
import { createClient } from '@/utils/supabase/client';
import { useWalletContext } from '../hooks/useWallet';

const PlaidLinkComponent = () => {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { userId, account } = useWalletContext();

  useEffect(() => {
    const createLinkToken = async () => {
      if (!userId || !account) {
        console.log('No userId or account available');
        return;
      }

      try {
        console.log('Requesting link token for user:', userId);
        const response = await axios.post('/api/plaid/create-link-token', {
          client_user_id: userId,
        });
        
        if (response.data.link_token) {
          console.log('Link token received:', response.data.link_token);
          setLinkToken(response.data.link_token);
        } else {
          console.error('No link token in response:', response.data);
          setError('No link token received from server');
        }
      } catch (error: any) {
        console.error('Error generating link token:', error.response?.data || error);
        setError(error.response?.data?.error || 'Failed to generate link token');
      }
    };

    if (userId && account) {
      createLinkToken();
    }
  }, [userId, account]);

  const onSuccess = async (public_token: string) => {
    try {
      const response = await axios.post('/api/plaid/exchange-token', {
        public_token,
        user_id: userId,
      });
      console.log('Access Token:', response.data.access_token);
    } catch (error: any) {
      console.error('Error exchanging public token:', error.response?.data || error);
      setError(error.response?.data?.error || 'Failed to exchange token');
    }
  };

  const { open, ready } = usePlaidLink({
    token: linkToken!,
    onSuccess,
  });

  // Only render the button if we have both userId and account
  if (!userId || !account) {
    return null;
  }

  return (
    <div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {linkToken && (
        <button onClick={() => open()} disabled={!ready}>
          Connect Bank
        </button>
      )}
      {!linkToken && !error && <p>Loading...</p>}
    </div>
  );
};

export default PlaidLinkComponent;