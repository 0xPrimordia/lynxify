import { useState } from 'react';
import SessionPasswordManager from '@/lib/utils/sessionPassword';

interface SessionPasswordModalProps {
    onSubmit: (password: string) => void;
    onCancel: () => void;
}

export const SessionPasswordModal = ({ onSubmit, onCancel }: SessionPasswordModalProps) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!password) {
            setError('Password is required');
            return;
        }
        onSubmit(password);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg max-w-md w-full">
                <h2 className="text-xl font-bold mb-4">Resume Session</h2>
                <p className="mb-4">Please enter your password to restore your wallet session</p>
                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full border rounded p-2 mb-4"
                        placeholder="Enter password"
                    />
                    {error && <p className="text-red-500 mb-4">{error}</p>}
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 border rounded"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-500 text-white rounded"
                        >
                            Submit
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}; 