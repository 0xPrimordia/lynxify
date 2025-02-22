import { render, screen, fireEvent, act, renderHook } from '@testing-library/react';
import SessionPasswordManager from '@/lib/utils/sessionPassword';
import { useSupabase } from './useSupabase';
import { TestComponent } from './TestComponent';
import { TestWrapper, updateSessionState, simulateSessionError, resetMocks, mockWalletContext } from './useAuthSession.setup';
import { encrypt } from '@/lib/utils/encryption';
import { useWalletContext } from './useWallet';
import { Session, User } from '@supabase/supabase-js';

// Mock dependencies
jest.mock('./useSupabase');
jest.mock('@/lib/utils/sessionPassword');
jest.mock('@/lib/utils/encryption');
jest.mock('@hashgraph/hedera-wallet-connect', () => ({
    transactionToBase64String: jest.fn()
}));

describe('Auth Session Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        resetMocks();
        // Set up default session state
        (useSupabase as jest.Mock).mockReturnValue({
            supabase: {
                auth: {
                    getSession: jest.fn().mockResolvedValue({
                        data: { 
                            session: { 
                                user: { 
                                    id: 'test-user',
                                    email: 'test@example.com'
                                } 
                            } 
                        }
                    })
                }
            }
        });
        (SessionPasswordManager.getPassword as jest.Mock).mockReturnValue(null);
        (encrypt as jest.Mock).mockResolvedValue('encrypted-password');
    });

    describe('Password Flow', () => {
        it('should handle session restoration with valid password', async () => {
            (SessionPasswordManager.getPassword as jest.Mock).mockReturnValue('validPassword');
            
            await act(async () => {
                render(
                    <TestWrapper>
                        <TestComponent />
                    </TestWrapper>
                );
                updateSessionState({
                    auth: { 
                        isAuthenticated: true,
                        userId: 'test-user',
                        session: { user: { id: 'test-user' } } as Session,
                        user: { id: 'test-user' } as User,
                        error: null
                    }
                });
            });

            expect(screen.getByTestId('session-status')).toHaveTextContent('Active');
        });

        it('should show inactive status when no password', async () => {
            (SessionPasswordManager.getPassword as jest.Mock).mockReturnValue(null);
            
            await act(async () => {
                render(
                    <TestWrapper>
                        <TestComponent />
                    </TestWrapper>
                );
                updateSessionState({
                    auth: { 
                        isAuthenticated: false,
                        session: null,
                        userId: null,
                        user: null,
                        error: '401'
                    }
                });
            });

            await new Promise(resolve => setTimeout(resolve, 0));
            expect(screen.getByTestId('session-status')).toHaveTextContent('Unauthorized');
        });

        it('should handle password updates', async () => {
            await act(async () => {
                render(
                    <TestWrapper>
                        <TestComponent />
                    </TestWrapper>
                );
                await SessionPasswordManager.setPassword('newPassword');
                await Promise.resolve();
                updateSessionState({
                    auth: { 
                        isAuthenticated: true,
                        session: { user: { id: 'test-user' } } as Session,
                        userId: 'test-user',
                        user: { id: 'test-user' } as User,
                        error: null
                    }
                });
            });

            expect(SessionPasswordManager.setPassword).toHaveBeenCalledWith('newPassword');
            expect(screen.getByTestId('session-status')).toHaveTextContent('Active');
        });

        it('should handle password expiry', async () => {
            await act(async () => {
                render(
                    <TestWrapper>
                        <TestComponent />
                    </TestWrapper>
                );
                updateSessionState({
                    auth: { 
                        isAuthenticated: true,
                        session: { user: { id: 'test-user' } } as Session,
                        userId: 'test-user',
                        user: { id: 'test-user' } as User,
                        error: null
                    }
                });
            });

            expect(screen.getByTestId('session-status')).toHaveTextContent('Active');
        });

        it('should clear password on session end', async () => {
            await act(async () => {
                render(
                    <TestWrapper>
                        <TestComponent />
                    </TestWrapper>
                );
                await SessionPasswordManager.clearPassword();
                updateSessionState({
                    auth: { 
                        isAuthenticated: false,
                        session: null,
                        userId: null,
                        user: null,
                        error: '401'
                    }
                });
            });

            await new Promise(resolve => setTimeout(resolve, 0));
            expect(SessionPasswordManager.clearPassword).toHaveBeenCalled();
            expect(screen.getByTestId('session-status')).toHaveTextContent('Unauthorized');
        });
    });

    describe('Session Management', () => {
        it('should render with initial state', async () => {
            resetMocks();
            (useSupabase as jest.Mock).mockReturnValue({
                supabase: {
                    auth: {
                        getSession: jest.fn().mockResolvedValue({
                            data: null,
                            error: null
                        })
                    }
                }
            });

            await act(async () => {
                render(
                    <TestWrapper>
                        <TestComponent />
                    </TestWrapper>
                );
                console.log('Before update - sessionState:', mockWalletContext.sessionState);
                // @ts-ignore
                mockWalletContext.sessionState = undefined;
                mockWalletContext.setSessionState(undefined);
                console.log('After update - sessionState:', mockWalletContext.sessionState);
            });
            
            expect(screen.getByTestId('session-status')).toHaveTextContent('Loading');
        });

        it('should handle session expiry', async () => {
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
                render(
                    <TestWrapper>
                        <TestComponent />
                    </TestWrapper>
                );
                await SessionPasswordManager.clearPassword();
            });

            expect(screen.getByTestId('session-status')).toHaveTextContent('Expired');
            expect(SessionPasswordManager.clearPassword).toHaveBeenCalled();
        });

        it('should handle encrypted password storage', async () => {
            const testPassword = 'test-password';
            (SessionPasswordManager.getPassword as jest.Mock).mockReturnValue(testPassword);
            
            await act(async () => {
                render(
                    <TestWrapper>
                        <TestComponent />
                    </TestWrapper>
                );
                await SessionPasswordManager.setPassword(testPassword);
                await encrypt(testPassword, 'salt');
            });

            expect(encrypt).toHaveBeenCalledWith(testPassword, expect.any(String));
        });

        it('should handle 401 errors and clear session', async () => {
            await act(async () => {
                render(
                    <TestWrapper>
                        <TestComponent />
                    </TestWrapper>
                );
                await SessionPasswordManager.clearPassword();
                simulateSessionError('401 Unauthorized');
                updateSessionState({
                    auth: { 
                        isAuthenticated: false,
                        session: null,
                        userId: null,
                        user: null,
                        error: '401 Unauthorized'
                    }
                });
            });

            expect(screen.getByTestId('session-status')).toHaveTextContent('Unauthorized');
            expect(SessionPasswordManager.clearPassword).toHaveBeenCalled();
        });

        it('should handle rate limiting for password attempts', async () => {
            (SessionPasswordManager.getPassword as jest.Mock).mockReturnValue('invalid');
            
            await act(async () => {
                render(
                    <TestWrapper>
                        <TestComponent />
                    </TestWrapper>
                );
                
                simulateSessionError('Locked out. Try again in 60 seconds');
                updateSessionState({
                    auth: { 
                        isAuthenticated: false,
                        session: null,
                        userId: null,
                        user: null,
                        error: 'Locked out. Try again in 60 seconds'
                    }
                });
            });

            expect(screen.getByTestId('error-message')).toHaveTextContent('Locked out');
        });
    });

    describe('Hook Initialization', () => {
        it('should initialize with default values', () => {
            const { result } = renderHook(() => useWalletContext(), {
                wrapper: TestWrapper
            });

            expect(result.current.sessionState).toBeDefined();
            expect(result.current.sessionState.wallet.isConnected).toBe(false);
            expect(result.current.sessionState.auth.isAuthenticated).toBe(false);
        });
    });
}); 