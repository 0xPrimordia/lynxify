import { Button, Modal, ModalContent, ModalHeader, ModalBody } from "@nextui-org/react";
import Link from "next/link";
import { Inria_Serif, VT323 } from "next/font/google";
import { useNFTGate } from "../hooks/useNFTGate";
import { useWalletContext } from "../hooks/useWallet";
import { useState, useEffect } from "react";
import TestnetAlert from "./TestnetAlert";
import PurchaseNFT from "./purchaseNFT";

const inriaSerif = Inria_Serif({ 
    weight: ["300", "400", "700"],
    subsets: ["latin"] 
});

const vt323 = VT323({ weight: "400", subsets: ["latin"] });

const LandingPage = () => {
    const [remainingSupply, setRemainingSupply] = useState<number>(0);
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const { account, client } = useWalletContext();
    const { hasAccess } = useNFTGate(account);
    const NFT_TOKEN_ID = process.env.NEXT_PUBLIC_NFT_TOKEN_ID;

    const handleAccessDenied = () => {
        setShowPurchaseModal(true);
    };

    useEffect(() => {
        const fetchSupply = async () => {
            try {
                const response = await fetch(
                    `https://testnet.mirrornode.hedera.com/api/v1/tokens/${NFT_TOKEN_ID}`
                );
                const data = await response.json();
                const maxSupply = data.max_supply;
                const currentSupply = data.total_supply;
                setRemainingSupply(maxSupply - currentSupply);
            } catch (error) {
                console.error('Error fetching token supply:', error);
            }
        };

        fetchSupply();
    }, []);

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
                    <p className="text-xl font-semibold mb-4">Remaining NFTs</p>
                    <p className="text-8xl font-bold text-[#0159E0]">{remainingSupply}</p>
                </div>
                {account && (
                    <Button 
                        size="lg" 
                        color="primary"
                        onClick={(e) => {
                            if (!hasAccess) {
                                e.preventDefault();
                                handleAccessDenied();
                            }
                        }}
                        href={hasAccess ? "/dex" : "#"}
                        as={Link}
                    >
                        {hasAccess ? "Enter DEX" : "Purchase Access NFT"}
                    </Button>
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