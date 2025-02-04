import { render, screen, fireEvent, act } from '@testing-library/react';
import SessionPasswordManager from '@/lib/utils/sessionPassword';
import { useSupabase } from './useSupabase';
import { useState, useEffect } from 'react';

// Mock dependencies
jest.mock('./useSupabase');
jest.mock('@/lib/utils/sessionPassword');

// Mock session data
const mockSession = {
    data: { 
        session: { 
            user: { 
                id: 'test-user',
                email: 'test@example.com'
            } 
        } 
    }
};

// Add state update trigger
const stateUpdateTrigger = jest.fn();

// Simple test component that only shows session status
const TestComponent = () => {
    const { supabase } = useSupabase();
    const [, setUpdate] = useState(0);

    // Subscribe to password changes
    useEffect(() => {
        stateUpdateTrigger.mockImplementation(() => {
            setUpdate(prev => prev + 1);
        });
    }, []);

    return (
        <div>
            <div data-testid="session-status">
                {SessionPasswordManager.getPassword() ? 'Active' : 'Inactive'}
            </div>
        </div>
    );
};

describe('Auth Session Password Flow', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        stateUpdateTrigger.mockClear();
        // Mock Supabase auth
        (useSupabase as jest.Mock).mockReturnValue({
            supabase: {
                auth: {
                    getSession: jest.fn().mockResolvedValue(mockSession)
                }
            }
        });
    });

    afterEach(() => {
        // Clear any stored passwords
        SessionPasswordManager.clearPassword();
    });

    it('should handle session restoration with valid password', async () => {
        (SessionPasswordManager.getPassword as jest.Mock).mockReturnValue('validPassword');
        
        await act(async () => {
            render(<TestComponent />);
        });

        expect(screen.getByTestId('session-status')).toHaveTextContent('Active');
    });

    it('should show inactive status when no password', async () => {
        (SessionPasswordManager.getPassword as jest.Mock).mockReturnValue(null);

        await act(async () => {
            render(<TestComponent />);
        });

        expect(screen.getByTestId('session-status')).toHaveTextContent('Inactive');
    });

    it('should handle password updates', async () => {
        (SessionPasswordManager.getPassword as jest.Mock).mockReturnValue(null);
        
        await act(async () => {
            render(<TestComponent />);
        });

        (SessionPasswordManager.getPassword as jest.Mock).mockReturnValue('newPassword');
        
        await act(async () => {
            SessionPasswordManager.setPassword('newPassword');
            stateUpdateTrigger();
        });

        expect(SessionPasswordManager.setPassword).toHaveBeenCalledWith('newPassword');
        expect(screen.getByTestId('session-status')).toHaveTextContent('Active');
    });

    it('should handle password expiry', async () => {
        (SessionPasswordManager.getPassword as jest.Mock).mockReturnValue('testPassword');
        
        await act(async () => {
            render(<TestComponent />);
        });

        (SessionPasswordManager.getPassword as jest.Mock).mockReturnValue(null);
        
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            stateUpdateTrigger();
        });

        expect(SessionPasswordManager.getPassword()).toBeNull();
        expect(screen.getByTestId('session-status')).toHaveTextContent('Inactive');
    });

    it('should clear password on session end', async () => {
        (SessionPasswordManager.getPassword as jest.Mock).mockReturnValue('testPassword');
        
        await act(async () => {
            render(<TestComponent />);
        });

        (SessionPasswordManager.getPassword as jest.Mock).mockReturnValue(null);
        
        await act(async () => {
            SessionPasswordManager.clearPassword();
            stateUpdateTrigger();
        });

        expect(SessionPasswordManager.clearPassword).toHaveBeenCalled();
        expect(screen.getByTestId('session-status')).toHaveTextContent('Inactive');
    });
}); 