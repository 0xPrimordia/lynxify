"use client"
import { Button } from "@nextui-org/react";
import Link from "next/link";
import { Inria_Serif } from "next/font/google";

const inriaSerif = Inria_Serif({ 
    weight: ["300", "400", "700"],
    subsets: ["latin"] 
});

export default function TestnetInstructions() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4 max-w-4xl mx-auto">
            <h1 className={`${inriaSerif.className} text-4xl font-bold mb-6`}>Testnet Instructions</h1>
            
            <div className="text-left w-full space-y-6">
                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold text-[#0159E0]">Getting Started with Testnet</h2>
                    <p>Follow these steps to get started with the Hedera Testnet:</p>
                    
                    <ol className="list-decimal pl-6 space-y-4">
                        <li>
                            <strong>Create a Testnet Account</strong>
                            <p>Visit the <a href="https://portal.hedera.com/" className="text-[#0159E0] hover:underline" target="_blank" rel="noopener noreferrer">Hedera Portal</a> to create your testnet account.</p>
                        </li>
                        
                        <li>
                            <strong>Get Testnet HBAR</strong>
                            <p>Use the Hedera Portal to fund your testnet account with HBAR. These are test tokens with no real value.</p>
                        </li>
                        
                        <li>
                            <strong>Connect Your Wallet</strong>
                            <p>Use HashPack or Blade wallet and ensure it's configured for Testnet.</p>
                        </li>
                        
                        <li>
                            <strong>Get Test NFT</strong>
                            <p>Purchase the test NFT using your testnet HBAR to access the DEX features.</p>
                        </li>
                    </ol>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold text-[#0159E0]">Important Notes</h2>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>Testnet tokens have no real value and are for testing purposes only.</li>
                        <li>Transactions on testnet are free and use test HBAR.</li>
                        <li>The testnet may occasionally be reset or experience downtime.</li>
                        <li>Never send real tokens to testnet addresses.</li>
                    </ul>
                </section>

                <div className="flex justify-center pt-8">
                    <Button 
                        as={Link}
                        href="/"
                        className="bg-[#0159E0]"
                        size="lg"
                    >
                        Return Home
                    </Button>
                </div>
            </div>
        </div>
    );
} 