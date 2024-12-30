"use client"
import { Button } from "@nextui-org/react";
import Link from "next/link";
import { Inria_Serif } from "next/font/google";
import { TESTNET_REWARDS } from "@/config/rewards";

const inriaSerif = Inria_Serif({ 
    weight: ["300", "400", "700"],
    subsets: ["latin"] 
});

export default function TestnetInstructions() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4 max-w-4xl mx-auto">
            <h1 className={`${inriaSerif.className} text-4xl font-bold mb-6 text-white`}>Testnet Instructions</h1>
            
            <div className="text-left w-full space-y-8">
                <section className="space-y-4">
                    <h2 className="text-2xl font-semibold text-[#0159E0]">Getting Started with Testnet</h2>
                    <p className="text-gray-300">Follow these steps to get started with the Hedera Testnet:</p>
                    
                    <ol className="list-decimal pl-6 space-y-6">
                        <li className="text-gray-300">
                            <strong className="text-white block mb-1">Create a Testnet Account</strong>
                            <p>Visit the <a href="https://portal.hedera.com/" className="text-[#0159E0] hover:underline" target="_blank" rel="noopener noreferrer">Hedera Portal</a> to create your testnet account.</p>
                        </li>
                        
                        <li className="text-gray-300">
                            <strong className="text-white block mb-1">Get Testnet HBAR</strong>
                            <p>Use the Hedera Portal to fund your testnet account with HBAR. These are test tokens with no real value.</p>
                        </li>
                        
                        <li className="text-gray-300">
                            <strong className="text-white block mb-1">Connect Your Wallet</strong>
                            <p>Use HashPack or Blade wallet and ensure it&apos;s configured for Testnet.</p>
                        </li>
                        
                        <li className="text-gray-300">
                            <strong className="text-white block mb-1">Get Test NFT</strong>
                            <p>Purchase the test NFT using your testnet HBAR to access the DEX features.</p>
                        </li>
                    </ol>
                </section>

                <section className="space-y-6">
                    <h2 className="text-2xl font-semibold text-[#0159E0]">Reward System</h2>
                    <div className="bg-[#1a1a1a] border border-[#333] p-6 rounded-xl mb-6">
                        <h3 className="text-white font-semibold mb-3">How to Earn a Free NFT</h3>
                        <p className="text-gray-300 mb-4">Our NFT costs {TESTNET_REWARDS.NFT_COST} XP total. You can earn it by:</p>
                        <ul className="list-disc pl-6 space-y-3">
                            <li className="text-gray-300">Earning up to {TESTNET_REWARDS.NETWORK_MAX_XP} XP on testnet</li>
                            <li className="text-gray-300">Earning another {TESTNET_REWARDS.NETWORK_MAX_XP} XP when we launch on mainnet</li>
                            <li className="text-gray-300">Complete all tasks on both networks to earn your NFT!</li>
                        </ul>
                    </div>
                    
                    <p className="text-white font-medium">Available tasks to earn XP:</p>
                    <div className="grid gap-4 md:grid-cols-2">
                        {Object.entries(TESTNET_REWARDS.TASKS).map(([taskId, task]) => (
                            <div key={taskId} className="bg-[#1a1a1a] border border-[#333] p-4 rounded-xl hover:border-[#0159E0] transition-colors duration-200">
                                <h3 className="text-white font-semibold mb-2">{task.description}</h3>
                                <p className="text-[#0159E0] font-bold">+{task.xp} XP</p>
                            </div>
                        ))}
                    </div>

                    <div className="bg-[#1a1a1a] border border-[#333] p-4 rounded-xl mt-6">
                        <p className="text-white font-medium">Total Available XP: {TESTNET_REWARDS.NETWORK_MAX_XP}</p>
                        <p className="text-gray-400 mt-2 text-sm">
                            Complete all tasks to maximize your XP earnings. Your progress will carry over when we launch on mainnet!
                        </p>
                    </div>
                </section>

                <div className="flex justify-center pt-8">
                    <Button 
                        as={Link}
                        href="/"
                        className="bg-[#0159E0] hover:bg-[#0147B1] transition-colors duration-200"
                        size="lg"
                    >
                        Return Home
                    </Button>
                </div>
            </div>
        </div>
    );
} 