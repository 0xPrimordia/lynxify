import { useState } from 'react';
import { useWalletContext } from '@/app/hooks/useWallet';
import { InAppWalletForm } from './InAppWalletForm';

export const ConnectWallet = () => {
    const [showInAppForm, setShowInAppForm] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [createdAccount, setCreatedAccount] = useState<string | null>(null);

    const handleCreateInAppWallet = async () => {
        setShowInAppForm(true);
    };

    return (
        <div className="space-y-6">
            {!showInAppForm ? (
                <>
                    <button
                        onClick={handleCreateInAppWallet}
                        disabled={isCreating}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#0159E0] hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isCreating ? 'Creating Wallet...' : 'Create In-App Wallet'}
                    </button>
                </>
            ) : (
                <div>
                    {createdAccount && (
                        <div className="mb-4 p-4 bg-green-900/50 border border-green-800 rounded-md">
                            <p className="text-sm text-green-200">{createdAccount}</p>
                        </div>
                    )}
                    <button
                        onClick={() => setShowInAppForm(false)}
                        className="mb-4 text-sm text-blue-400 hover:text-blue-300"
                    >
                        ← Back
                    </button>
                    <InAppWalletForm />
                </div>
            )}
        </div>
    );
}; 