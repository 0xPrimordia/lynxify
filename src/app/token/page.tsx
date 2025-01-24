"use client"
import { Button, Card } from "@nextui-org/react";
import Image from "next/image";
import Link from "next/link";
import { Inria_Serif, VT323 } from "next/font/google";
import { useNFTGate } from "../hooks/useNFTGate";
import { useWalletContext } from "../hooks/useWallet";
import PurchaseNFT from "../components/purchaseNFT";
import { useState } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody } from "@nextui-org/react";

const inriaSerif = Inria_Serif({ 
    weight: ["300", "400", "700"],
    subsets: ["latin"] 
});

const vt323 = VT323({
    weight: ["400"],
    subsets: ["latin"]
});

export default function TokenPage() {
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const { account, client } = useWalletContext();
    const { hasAccess } = useNFTGate(account);

    if (!account) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
                <h1 className={`${vt323.className} text-4xl font-bold mb-6`}>LXY Token Early Access</h1>
                <Card className="max-w-2xl p-8 bg-gray-900 text-white shadow-lg">
                    <div className="bg-yellow-100 text-yellow-800 p-4 rounded mb-6">
                        Connect your wallet to check if you have access to LXY token features.
                    </div>
                    <h2 className={`${vt323.className} text-2xl font-semibold mb-4`}>Why Purchase an NFT?</h2>
                    <ul className="text-left list-disc list-inside mb-6 space-y-4 mt-4 pl-6">
                        <li className="flex items-center">
                            <span className="mr-2">🔑</span>
                            Exclusive early access to token information and updates.
                        </li>
                        <li className="flex items-center">
                            <span className="mr-2">🌐</span>
                            Participation in a vibrant community of early adopters.
                        </li>
                        <li className="flex items-center">
                            <span className="mr-2">🗳️</span>
                            Opportunities for future governance participation.
                        </li>
                        <li className="flex items-center">
                            <span className="mr-2">🚀</span>
                            Early access to token minting and governance.
                        </li>
                    </ul>
                </Card>
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
                <h1 className={`${vt323.className} text-4xl font-bold mb-6`}>LXY Token Access</h1>
                <Card className="max-w-2xl p-8 bg-gray-900 text-white shadow-lg">
                    <h2 className="text-2xl font-semibold mb-4">Members Only Access Required</h2>
                    <p className="text-lg mb-6">
                        To access LXY token features, you need to hold a Lynxify Members NFT. 
                        This NFT grants you exclusive access to governance and early token minting opportunities.
                    </p>
                    <Button 
                        color="primary" 
                        size="lg"
                        onPress={() => setShowPurchaseModal(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        Purchase Members NFT
                    </Button>
                </Card>

                <Modal 
                    isOpen={showPurchaseModal} 
                    onClose={() => setShowPurchaseModal(false)}
                    classNames={{
                        base: "bg-black border border-gray-800 rounded-lg",
                        header: "border-b border-gray-800",
                        body: "max-h-[400px] overflow-y-auto",
                        closeButton: "hover:bg-gray-800 active:bg-gray-700"
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
            <h1 className={`${vt323.className} text-5xl font-bold mb-6`}>Welcome Lynxify Member!</h1>
            <Card className="max-w-4xl p-8 bg-black text-white border border-gray-700 shadow-lg rounded-md">
                <h2 className={`${vt323.className} text-3xl font-semibold mb-4`}>Early Access Coming Soon</h2>
                <p className="text-lg mb-4">
                    As a Lynxify Members NFT holder, you&apos;ll get exclusive early access to:
                </p>
                <ul className="text-left list-disc list-inside mb-6 space-y-4 mt-4 mx-auto pl-8 pr-8 max-w-lg">
                    <li className="flex items-center">
                        <span className="mr-2">🔑</span>
                        LXY Token Governance
                    </li>
                    <li className="flex items-center">
                        <span className="mr-2">🧪</span>
                        Testnet Token Minting
                    </li>
                    <li className="flex items-center">
                        <span className="mr-2">🎁</span>
                        Additional Member Benefits
                    </li>
                </ul>
                <h3 className={`${vt323.className} text-3xl font-semibold mb-6  mt-6`}>How the Token Works:</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-black p-4 border border-gray-700 rounded-md shadow-md">
                        <h4 className={`${vt323.className} text-2xl font-semibold mb-2`}>Minting Process</h4>
                        <p className="text-sm mb-8">
                            Users deposit the exact proportion of underlying tokens as defined by the index. Smart contracts mint $LXY tokens based on the deposited value.
                        </p>
                        <Image src="/images/mint.png" alt="Minting Process" width={320} height={88} className="mb-4" />
                    </div>
                    <div className="bg-black p-4 border border-gray-700 rounded-md shadow-md">
                        <h4 className={`${vt323.className} text-2xl font-semibold mb-2`}>Burning Process</h4>
                        <p className="text-sm mb-4">
                            Users can redeem their $LXY tokens, which are then burned by the smart contract. The corresponding share of underlying assets is released back to the user.
                        </p>
                        <Image src="/images/burn.png" alt="Burning Process" width={320} height={88} className="mb-4" />
                    </div>
                    <div className="bg-black p-4 border border-gray-700 rounded-md shadow-md">
                        <h4 className={`${vt323.className} text-2xl font-semibold mb-2`}>Governance Participation</h4>
                        <p className="text-sm mb-8">
                            Token holders can stake $LXY to earn voting shares, allowing them to participate in governance decisions and earn from swap fees on the token LPs.
                        </p>
                        <div className="text-center">
                            <Image src="/images/stake.png" alt="Staking Process" width={120} height={88} className="mb-4 mx-auto" />
                        </div>
                    </div>
                </div>
                <p className={`${vt323.className} text-lg mb-4 mt-6`}>
                    Join our waitlist to be among the first to mint and stake LXY tokens.
                </p>
                <Button 
                    color="primary" 
                    size="lg"
                    onPress={() => window.open('https://spreeform.com/your-waitlist-form', '_blank')}
                    className="bg-blue-600 hover:bg-blue-700 text-white mb-6"
                >
                    Join Waitlist
                </Button>
                <p className={`${vt323.className} text-lg mb-4`}>
                    Participate in governance discussions on our <a href="https://discord.gg/GM5BfpPe2Y" target="_blank" className="text-[#0159E0] underline">Discord channel</a>.
                </p>
                <p className={`${vt323.className} text-3xl font-semibold text-[#0159E0] mt-8`}>
                    Check back on March 1st for early access!
                </p>
            </Card>
        </div>
    );
} 