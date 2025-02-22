'use client';

import { Button } from "@nextui-org/react";
import { CurrencyDollarIcon, UserGroupIcon, ChartBarIcon } from '@heroicons/react/24/outline';

export default function StakingPage() {
    return (
        <div className="min-h-screen bg-black text-white p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold mb-4">LXY Staking</h1>
                    <div className="inline-block px-4 py-2 bg-[#0159E0] rounded-full text-sm font-semibold mb-6">
                        Coming Soon
                    </div>
                    <p className="text-gray-400 text-lg">
                        Participate in Lynxify governance and earn rewards through LXY staking
                    </p>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                    <div className="bg-gray-800 p-6 rounded-xl">
                        <CurrencyDollarIcon className="h-12 w-12 text-[#0159E0] mb-4" />
                        <h3 className="text-xl font-semibold mb-2">Earn Rewards</h3>
                        <p className="text-gray-400">
                            Stake your LXY tokens to earn a share of protocol fees and rewards
                        </p>
                    </div>
                    <div className="bg-gray-800 p-6 rounded-xl">
                        <UserGroupIcon className="h-12 w-12 text-[#0159E0] mb-4" />
                        <h3 className="text-xl font-semibold mb-2">Shape the Future</h3>
                        <p className="text-gray-400">
                            Participate in governance decisions and help guide protocol development
                        </p>
                    </div>
                    <div className="bg-gray-800 p-6 rounded-xl">
                        <ChartBarIcon className="h-12 w-12 text-[#0159E0] mb-4" />
                        <h3 className="text-xl font-semibold mb-2">Protocol Growth</h3>
                        <p className="text-gray-400">
                            Contribute to the growth and decentralization of the Lynxify ecosystem
                        </p>
                    </div>
                </div>

                {/* Governance Section */}
                <div className="bg-gray-800 rounded-xl p-8 mb-12">
                    <h2 className="text-2xl font-bold mb-4">Governance Overview</h2>
                    <p className="text-gray-400 mb-6">
                        LXY token holders can participate in governance by staking their tokens. 
                        Staked tokens represent voting power in protocol decisions, including:
                    </p>
                    <ul className="list-disc list-inside text-gray-400 mb-6 space-y-2">
                        <li>Protocol fee adjustments</li>
                        <li>Treasury fund allocation</li>
                        <li>Protocol upgrades and improvements</li>
                        <li>Partnership proposals</li>
                    </ul>
                </div>

                {/* CTA Section */}
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Want to Get Involved?</h2>
                    <p className="text-gray-400 mb-6">
                        Join our Discord community to learn more about governance opportunities 
                        and stay updated on the LXY token launch.
                    </p>
                    <Button
                        color="primary"
                        size="lg"
                        onClick={() => window.open('https://discord.gg/GM5BfpPe2Y', '_blank')}
                        className="px-8"
                    >
                        Join Discord Community
                    </Button>
                </div>
            </div>
        </div>
    );
} 