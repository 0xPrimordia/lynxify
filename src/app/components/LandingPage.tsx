import { Button } from "@nextui-org/react";
import Link from "next/link";
import { Inria_Serif } from "next/font/google";
import { useNFTGate } from "../hooks/useNFTGate";
import { useWalletContext } from "../hooks/useWallet";
import { useState } from "react";
import { useEffect } from "react";

const inriaSerif = Inria_Serif({ 
    weight: ["300", "400", "700"],
    subsets: ["latin"] 
});

const LandingPage = () => {
    const [remainingSupply, setRemainingSupply] = useState<number>(0);
    const { account } = useWalletContext();
    const { hasAccess } = useNFTGate(account);
    const NFT_TOKEN_ID = process.env.NEXT_PUBLIC_NFT_TOKEN_ID;

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
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
            <h1 className={`${inriaSerif.className} text-4xl font-bold mb-6`}>Lynxify Members Only</h1>
            <p className="text-xl mb-8 max-w-2xl">
                Access our advanced DEX with the Lynxify Lifetime Membership NFT. 
                Enjoy lifetime access to closed betas, early access, and premium features.
            </p>
            <div className="mb-8">
                <p className="text-xl font-semibold mb-4">Remaining NFTs</p>
                <p className="text-4xl font-bold text-blue-500">{remainingSupply}</p>
            </div>
            <Button 
                size="lg" 
                color="primary"
                as={Link}
                href={hasAccess ? "/dex" : "#"}
                onClick={(e) => {
                    if (!hasAccess) {
                        e.preventDefault();
                        alert("Please purchase an NFT first");
                    }
                }}
            >
                {hasAccess ? "Enter DEX" : "Purchase Access NFT"}
            </Button>
        </div>
    );
};

export default LandingPage; 