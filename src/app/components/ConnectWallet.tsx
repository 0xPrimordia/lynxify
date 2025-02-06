import { useState } from 'react';
import { InAppWalletForm } from './InAppWalletForm';

export const ConnectWallet = () => {
    const [showInAppForm, setShowInAppForm] = useState(false);

    const handleCreateInAppWallet = () => {
        setShowInAppForm(true);
    };

    return (
        <div className="space-y-6">
            {!showInAppForm ? (
                <>
                    <p className="text-sm text-gray-400">Create your new Hedera wallet.</p>
                    <button
                        onClick={handleCreateInAppWallet}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#0159E0] hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Create In-App Wallet
                    </button>
                </>
            ) : (
                <div>
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