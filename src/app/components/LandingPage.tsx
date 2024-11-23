import { Button } from "@nextui-org/react";
import { useEffect, useState } from "react";
import Link from "next/link";

const LandingPage = () => {
    const [remainingSupply, setRemainingSupply] = useState<number>(0);
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
            <h1 className="text-4xl font-bold mb-6">Lynxify Members Only</h1>
            <p className="text-xl mb-8 max-w-2xl">
                Access our advanced DEX with the Lynxify Lifetime Membership NFT. 
                Enjoy low fees, automated trading, and advanced charting tools.
            </p>
            <div className="mb-8">
                <p className="text-2xl font-semibold">Remaining NFTs</p>
                <p className="text-4xl font-bold text-blue-500">{remainingSupply}</p>
            </div>
            <Button 
                size="lg" 
                color="primary"
                as={Link}
                href="/dex"
            >
                Purchase Access NFT
            </Button>
        </div>
    );
};

export default LandingPage; 