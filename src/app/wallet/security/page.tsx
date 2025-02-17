'use client';

import { useState, useEffect } from 'react';
import { useInAppWallet } from '@/app/contexts/InAppWalletContext';
import { decrypt } from '@/lib/utils/encryption';

export default function SecurityPage() {
    const { loadWallet } = useInAppWallet();
    const [showKey, setShowKey] = useState(false);
    const [privateKey, setPrivateKey] = useState<string | null>(null);
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    
    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        
        try {
            // Attempt to decrypt the stored key with provided password
            const decryptedKey = await loadWallet(password);
            if (!decryptedKey) throw new Error('Failed to load wallet');
            setPrivateKey(decryptedKey.toString());
            setShowKey(true);
            
            // Auto-hide after 5 minutes
            setTimeout(() => {
                setShowKey(false);
                setPrivateKey(null);
            }, 5 * 60 * 1000);
        } catch (err) {
            setError('Invalid password');
        }
    };

    // Clear key when leaving page
    useEffect(() => {
        return () => {
            setPrivateKey(null);
            setShowKey(false);
        };
    }, []);

    return (
        <div className="min-h-screen bg-black">
            {!showKey ? (
                <form onSubmit={handlePasswordSubmit}>
                    <input 
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter wallet password"
                    />
                    {error && <div className="text-red-500">{error}</div>}
                </form>
            ) : (
                <div>
                    <div className="bg-yellow-900 p-4 rounded-lg mb-6 border border-yellow-700">
                        <p className="text-yellow-200 text-sm">
                            Warning: Never share your private key. Anyone with your key can access your account.
                        </p>
                    </div>
                    {/* Similar UI to verify-email page for showing the key */}
                </div>
            )}
        </div>
    );
} 