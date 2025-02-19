import { Button, Modal, ModalContent, ModalHeader, ModalBody } from "@nextui-org/react";
import Link from "next/link";
import { Inria_Serif, VT323 } from "next/font/google";
import { useNFTGate } from "../hooks/useNFTGate";
import { useWalletContext } from "../hooks/useWallet";
import { useState, useEffect } from "react";
import TestnetAlert from "./TestnetAlert";
import PurchaseNFT from "./purchaseNFT";
import { useSearchParams } from 'next/navigation';
import { useRewards } from "../hooks/useRewards";

const inriaSerif = Inria_Serif({ 
    weight: ["300", "400", "700"],
    subsets: ["latin"] 
});

const vt323 = VT323({ weight: "400", subsets: ["latin"] });

const LandingPage = () => {
    const [nftCount, setNftCount] = useState<number>(0);
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const { account, client, userId } = useWalletContext();
    const { awardXP } = useRewards();
    const { hasAccess } = useNFTGate(account);
    const NFT_TOKEN_ID = process.env.NEXT_PUBLIC_NFT_TOKEN_ID;
    const searchParams = useSearchParams();

    useEffect(() => {
        if (searchParams.get('purchase') === 'true') {
            setShowPurchaseModal(true);
        }
    }, [searchParams]);

    useEffect(() => {
        if (account && userId) {
            awardXP(userId, account, 'CONNECT_WALLET');
        }
    }, [account, awardXP, userId]);

    const handleAccessDenied = () => {
        setShowPurchaseModal(true);
    };

    useEffect(() => {
        const fetchNFTCount = async () => {
            try {
                const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK || 'testnet';
                const mirrorNodeUrl = network === 'mainnet' 
                    ? 'https://mainnet-public.mirrornode.hedera.com'
                    : 'https://testnet.mirrornode.hedera.com';

                // Get NFTs held by the treasury/operator with total count
                const response = await fetch(
                    `${mirrorNodeUrl}/api/v1/tokens/${NFT_TOKEN_ID}/balances?account.id=${process.env.NEXT_PUBLIC_OPERATOR_ID}`
                );
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                
                // Check if data exists and has balances array
                if (data.balances && data.balances.length > 0) {
                    // Get the balance for our token
                    const tokenBalance = data.balances[0]; // Should be the only balance since we filtered by token
                    if (tokenBalance) {
                        setNftCount(tokenBalance.balance);
                    } else {
                        setNftCount(0);
                    }
                } else {
                    setNftCount(0);
                }
            } catch (error) {
                console.error('Error fetching NFT count:', error);
                setNftCount(0);
            }
        };

        fetchNFTCount();
    }, [NFT_TOKEN_ID]);

    return (
        <>
            <TestnetAlert />
            <div className={`flex flex-col items-center justify-center min-h-[80vh] text-center px-4 ${process.env.NEXT_PUBLIC_HEDERA_NETWORK === 'testnet' ? 'pt-24' : ''}`}>
                <h1 className={`${inriaSerif.className} text-4xl font-bold mb-6`}>Lynxify Members Only</h1>
                <p className="text-base mb-8 max-w-2xl">
                    Access our advanced DEX with the Lynxify Lifetime Membership NFT. 
                    Enjoy lifetime access to closed betas, early access, and premium features.
                </p>
                <div className="mb-8">
                    <p className="text-xl font-semibold mb-4">Available NFTs</p>
                    <p className="text-8xl font-bold text-[#0159E0]">{nftCount}</p>
                </div>
                {account && (
                    <Button 
                        size="lg" 
                        color="primary"
                        onPress={(e) => {
                            if (!hasAccess) {
                                handleAccessDenied();
                            }
                        }}
                        href={hasAccess ? "/dex" : "#"}
                        as={Link}
                    >
                        {hasAccess ? "Enter DEX" : "Purchase Access NFT"}
                    </Button>
                )}
                {!account && (
                    <p className="text-sm text-gray-500">Connect your wallet to purchase an NFT</p>
                )}
            </div>

            <Modal 
                isOpen={showPurchaseModal} 
                onClose={() => setShowPurchaseModal(false)}
                classNames={{
                    base: "max-w-md mx-auto",
                    header: vt323.className
                }}
                placement="center"
            >
                <ModalContent>
                    <ModalHeader className="text-2xl">Purchase Access NFT</ModalHeader>
                    <ModalBody>
                        <PurchaseNFT 
                            apiUrl="/api/nft"
                            tokenId={process.env.NEXT_PUBLIC_ACCESS_NFT_TOKEN_ID || ""}
                            client={client}
                        />
                    </ModalBody>
                </ModalContent>
            </Modal>
        </>
    );
};

export default LandingPage; 