'use client';

import { useEffect, useState } from 'react';
import { useInAppWallet } from '@/app/contexts/InAppWalletContext';
import { PhotoIcon } from '@heroicons/react/24/outline';

interface NFT {
    token_id: string;
    serial_number: number;
    metadata?: string;
    name?: string;
    image?: string;
}

export default function NFTsPage() {
    const { inAppAccount } = useInAppWallet();
    const [nfts, setNfts] = useState<NFT[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchNFTs = async () => {
            if (!inAppAccount) return;
            
            try {
                setIsLoading(true);
                // Fetch NFTs from mirror node
                const response = await fetch(
                    `https://${process.env.NEXT_PUBLIC_HEDERA_NETWORK}.mirrornode.hedera.com/api/v1/accounts/${inAppAccount}/nfts`
                );
                
                if (!response.ok) throw new Error('Failed to fetch NFTs');
                
                const data = await response.json();
                
                // Filter out potential spam NFTs
                const whitelistedNFTs = data.nfts.filter((nft: any) => {
                    // Add whitelist logic here
                    // For example: check against known collection IDs
                    return true; // For now, accept all
                });

                // Fetch metadata for each NFT
                const nftsWithMetadata = await Promise.all(
                    whitelistedNFTs.map(async (nft: any) => {
                        try {
                            const tokenResponse = await fetch(
                                `https://${process.env.NEXT_PUBLIC_HEDERA_NETWORK}.mirrornode.hedera.com/api/v1/tokens/${nft.token_id}`
                            );
                            const tokenData = await tokenResponse.json();
                            
                            return {
                                ...nft,
                                name: tokenData.name,
                                metadata: tokenData.metadata,
                                image: tokenData.metadata ? `https://ipfs.io/ipfs/${tokenData.metadata}` : undefined
                            };
                        } catch (error) {
                            console.error('Error fetching NFT metadata:', error);
                            return nft;
                        }
                    })
                );

                setNfts(nftsWithMetadata);
            } catch (error) {
                console.error('Error fetching NFTs:', error);
                setError('Failed to load NFTs');
            } finally {
                setIsLoading(false);
            }
        };

        fetchNFTs();
    }, [inAppAccount]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black text-white p-8">
                <div className="animate-pulse">Loading NFTs...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-black text-white p-8">
                <div className="text-red-500">{error}</div>
            </div>
        );
    }

    if (nfts.length === 0) {
        return (
            <div className="min-h-screen bg-black text-white p-8">
                <div className="text-center">
                    <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-semibold text-white">No NFTs</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        You don't have any NFTs in your wallet yet.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {nfts.map((nft) => (
                    <div 
                        key={`${nft.token_id}-${nft.serial_number}`}
                        className="bg-gray-800 rounded-lg overflow-hidden"
                    >
                        {nft.image ? (
                            <img 
                                src={nft.image} 
                                alt={nft.name || 'NFT'} 
                                className="w-full h-48 object-cover"
                            />
                        ) : (
                            <div className="w-full h-48 bg-gray-700 flex items-center justify-center">
                                <PhotoIcon className="h-12 w-12 text-gray-500" />
                            </div>
                        )}
                        <div className="p-4">
                            <h3 className="text-lg font-semibold">
                                {nft.name || 'Unnamed NFT'}
                            </h3>
                            <p className="text-sm text-gray-400">
                                Token ID: {nft.token_id}
                            </p>
                            <p className="text-sm text-gray-400">
                                Serial #: {nft.serial_number}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
} 