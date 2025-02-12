import { render, screen, fireEvent, act } from '@testing-library/react';
import SessionPasswordManager from '@/lib/utils/sessionPassword';
import { useSupabase } from './useSupabase';
import { useState, useEffect } from 'react';
import { encrypt } from '@/lib/utils/encryption';
import { TestComponent } from './TestComponent';
import { TestWrapper, updateSessionState, simulateSessionError, resetMocks } from './useAuthSession.setup';

// Mock dependencies
jest.mock('./useSupabase');
jest.mock('@/lib/utils/sessionPassword');
jest.mock('@/lib/utils/encryption');

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

describe('Auth Session Management', () => {
    beforeEach(() => {
        resetMocks();
    });

    it('should render with initial state', () => {
        render(
            <TestWrapper>
                <TestComponent />
            </TestWrapper>
        );
        expect(screen.getByTestId('session-status')).toHaveTextContent('Loading');
    });

    it('should handle session expiry', async () => {
        // Mock expired session
        (useSupabase as jest.Mock).mockReturnValue({
            supabase: {
                auth: {
                    getSession: jest.fn().mockResolvedValue({
                        data: { session: null },
                        error: null
                    })
                }
            }
        });

        await act(async () => {
            render(<TestComponent />);
        });

        expect(screen.getByTestId('session-status')).toHaveTextContent('Expired');
        expect(SessionPasswordManager.clearPassword).toHaveBeenCalled();
    });

    it('should handle encrypted password storage', async () => {
        const testPassword = 'test-password';
        const encryptedPassword = 'encrypted-test-password';
        (encrypt as jest.Mock).mockResolvedValue(encryptedPassword);
        
        await act(async () => {
            render(<TestComponent />);
            await SessionPasswordManager.setPassword(testPassword);
        });

        expect(encrypt).toHaveBeenCalledWith(testPassword, expect.any(String));
        expect(SessionPasswordManager.getPassword).toHaveBeenCalled();
    });

    it('should handle 401 errors and clear session', async () => {
        // Mock 401 error
        (useSupabase as jest.Mock).mockReturnValue({
            supabase: {
                auth: {
                    getSession: jest.fn().mockRejectedValue({
                        status: 401,
                        message: 'Unauthorized'
                    })
                }
            }
        });

        await act(async () => {
            render(<TestComponent />);
        });

        expect(screen.getByTestId('session-status')).toHaveTextContent('Unauthorized');
        expect(SessionPasswordManager.clearPassword).toHaveBeenCalled();
    });

    it('should handle rate limiting for password attempts', async () => {
        // Mock rate limit error
        (SessionPasswordManager.getPassword as jest.Mock)
            .mockRejectedValueOnce(new Error('Too many attempts'))
            .mockRejectedValueOnce(new Error('Too many attempts'))
            .mockRejectedValueOnce(new Error('Locked out. Try again in 60 seconds'));

        await act(async () => {
            render(<TestComponent />);
        });

        // Attempt password retrieval multiple times
        for (let i = 0; i < 3; i++) {
            await act(async () => {
                fireEvent.click(screen.getByTestId('retry-button'));
            });
        }

        expect(screen.getByTestId('error-message')).toHaveTextContent('Locked out');
        expect(screen.getByTestId('countdown')).toBeInTheDocument();
    });
}); 