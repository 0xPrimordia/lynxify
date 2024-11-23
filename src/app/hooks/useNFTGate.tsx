import { useEffect, useState } from 'react';

export const useNFTGate = (accountId: string) => {
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const NFT_TOKEN_ID = process.env.NEXT_PUBLIC_NFT_TOKEN_ID;

  useEffect(() => {
    const checkNFTAccess = async () => {
      if (!accountId) {
        setHasAccess(false);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}/nfts?token.id=${NFT_TOKEN_ID}`
        );
        
        const data = await response.json();
        setHasAccess(data.nfts && data.nfts.length > 0);
      } catch (error) {
        console.error('Error checking NFT access:', error);
        setHasAccess(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkNFTAccess();
  }, [accountId]);

  return { hasAccess, isLoading };
};