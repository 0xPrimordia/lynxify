"use client"
import { Button, Card } from "@nextui-org/react";
import Link from "next/link";
import { Inria_Serif } from "next/font/google";
import { useNFTGate } from "../hooks/useNFTGate";
import { useWalletContext } from "../hooks/useWallet";
import PurchaseNFT from "../components/purchaseNFT";
import { useState } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody } from "@nextui-org/react";

const inriaSerif = Inria_Serif({ 
    weight: ["300", "400", "700"],
    subsets: ["latin"] 
});

export default function TokenPage() {
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const { account, client } = useWalletContext();
    const { hasAccess } = useNFTGate(account);

    if (!account) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
                <h1 className={`${inriaSerif.className} text-4xl font-bold mb-6`}>LXY Token Access</h1>
                <Card className="max-w-2xl p-8">
                    <p className="text-lg mb-6">
                        Connect your wallet to check if you have access to LXY token features.
                    </p>
                </Card>
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
                <h1 className={`${inriaSerif.className} text-4xl font-bold mb-6`}>LXY Token Access</h1>
                <Card className="max-w-2xl p-8">
                    <h2 className="text-2xl font-semibold mb-4">Members Only Access Required</h2>
                    <p className="text-lg mb-6">
                        To access LXY token features, you need to hold a Lynxify Members NFT. 
                        This NFT grants you exclusive access to governance and early token minting opportunities.
                    </p>
                    <Button 
                        color="primary" 
                        size="lg"
                        onPress={() => setShowPurchaseModal(true)}
                    >
                        Purchase Members NFT
                    </Button>
                </Card>

                <Modal 
                    isOpen={showPurchaseModal} 
                    onClose={() => setShowPurchaseModal(false)}
                    classNames={{
                        base: "max-w-md mx-auto"
                    }}
                >
                    <ModalContent>
                        <ModalHeader>Purchase Members NFT</ModalHeader>
                        <ModalBody>
                            <PurchaseNFT 
                                apiUrl="/api/nft"
                                tokenId={process.env.NEXT_PUBLIC_ACCESS_NFT_TOKEN_ID || ""}
                                client={client}
                            />
                        </ModalBody>
                    </ModalContent>
                </Modal>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
            <h1 className={`${inriaSerif.className} text-4xl font-bold mb-6`}>Welcome Lynxify Member!</h1>
            <Card className="max-w-3xl p-8">
                <h2 className="text-2xl font-semibold mb-4">Early Access Coming Soon</h2>
                <p className="text-lg mb-4">
                    As a Lynxify Members NFT holder, you'll get exclusive early access to:
                </p>
                <ul className="text-left list-disc list-inside mb-6 space-y-2">
                    <li>LXY Token Governance</li>
                    <li>Testnet Token Minting</li>
                    <li>Additional Member Benefits</li>
                </ul>
                <p className="text-xl font-semibold text-[#0159E0] mt-8">
                    Check back on March 1st for early access!
                </p>
            </Card>
        </div>
    );
} 