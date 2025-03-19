"use client";
import React from "react";
import { Button, Navbar, NavbarContent, NavbarItem, NavbarBrand, Link, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, NavbarMenuToggle, NavbarMenu, NavbarMenuItem } from "@nextui-org/react";
import { useWalletContext } from "../hooks/useWallet";
import { useInAppWallet } from "../contexts/InAppWalletContext";
import { useNFTGate } from "../hooks/useNFTGate";
import { useRewards } from "../hooks/useRewards";
import PurchaseNFT from "./purchaseNFT";
import { useState, useEffect } from "react";
import { AccountBalanceQuery, AccountId } from "@hashgraph/sdk";
import { handleDisconnectSessions, clearStoredSession } from '../../utils/supabase/session';
import { ConnectWallet } from './ConnectWallet';
import { useSupabase } from "../hooks/useSupabase";
import { useRouter } from "next/navigation";
import { toast } from 'sonner';
import { Subject } from 'rxjs';
import Image from 'next/image';
import { vt323 } from '../fonts';

const balanceSubject = new Subject<void>();
export let lastFetch = 0;
const FETCH_COOLDOWN = 5000; // 5s minimum between fetches

export const useBalance = (accountId: string, client: any) => {
    const [balance, setBalance] = useState('0.00');
    
    useEffect(() => {
        if (!accountId || !client) return;
        
        const fetchBalance = async () => {
            // Prevent too frequent updates
            if (Date.now() - lastFetch < FETCH_COOLDOWN) return;
            lastFetch = Date.now();
            
            try {
                const query = new AccountBalanceQuery()
                    .setAccountId(AccountId.fromString(accountId));
                const result = await query.execute(client);
                setBalance(parseFloat(result.hbars.toString()).toFixed(2));
            } catch (error) {
                console.error('Balance fetch failed:', error);
            }
        };

        // Set up polling (every 30s)
        const pollId = setInterval(fetchBalance, 30000);
        
        // Set up subscription for immediate updates
        const subscription = balanceSubject.subscribe(fetchBalance);
        
        // Initial fetch
        fetchBalance();

        return () => {
            clearInterval(pollId);
            subscription.unsubscribe();
        };
    }, [accountId, client]);

    return {
        balance,
        refreshBalance: () => balanceSubject.next()
    };
};

export const resetLastFetch = () => { lastFetch = 0; };

const Header = () => {
    const { 
        handleConnect, 
        account,
        client: extensionClient,
        handleDisconnect,
        error: extensionError,
        setError,
        setAccount
    } = useWalletContext();
    
    const { 
        inAppAccount,
        isInAppWallet,
        client: inAppClient,
        error: inAppError,
        setInAppAccount
    } = useInAppWallet();
    const { hasAccess, isLoading: nftLoading } = useNFTGate(account);
    const { fetchAchievements, totalXP } = useRewards();
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const { balance, refreshBalance } = useBalance(account || inAppAccount || '', isInAppWallet ? inAppClient : extensionClient);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showConnectModal, setShowConnectModal] = useState(false);
    const { supabase } = useSupabase();
    const [isSignedIn, setIsSignedIn] = useState(false);
    const router = useRouter();

    console.log('Wallet state:', {
        extensionAccount: account,
        inAppAccount,
        extensionClient: !!extensionClient,
        inAppClient: !!inAppClient,
        isInAppWallet
    });

    // Combine errors from both contexts
    const error = isInAppWallet ? inAppError : extensionError;

    useEffect(() => {
        // Initial session check
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setIsSignedIn(!!session);
        };
        checkSession();

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setIsSignedIn(!!session);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [supabase]);

    const activeAccount = account || inAppAccount;
    const isConnected = Boolean(activeAccount);

    useEffect(() => {
        if (isConnected || isSignedIn) {
            refreshBalance();
        }
    }, [isConnected, isSignedIn, refreshBalance]);

    const handleCopyAccount = async (accountId: string) => {
        try {
            await navigator.clipboard.writeText(accountId);
            toast.success('Account ID copied to clipboard');
        } catch (err) {
            toast.error('Failed to copy account ID');
        }
    };

    const handleSignOut = async () => {
        try {
            console.log('Starting sign out process...', { isInAppWallet, account, isSignedIn });
            
            // Clear all stored sessions and states
            clearStoredSession();
            localStorage.removeItem('walletconnect');  // Clear WalletConnect data
            
            const promises: Promise<any>[] = [];
            
            // Handle extension wallet
            if (account && !isInAppWallet) {
                console.log('Disconnecting extension wallet...');
                promises.push(handleDisconnect());
            }
            
            // For in-app wallet or any signed in user
            if (isInAppWallet || isSignedIn) {
                console.log('Signing out of Supabase...');
                promises.push(supabase.auth.signOut());
            }
            
            await Promise.all(promises);
            console.log('Sign out promises completed');
            
            // Force clear all wallet states
            setInAppAccount("");  // Clear in-app account
            setAccount("");      // Clear extension account
            setIsMenuOpen(false);
            
            router.push('/');
            router.refresh();
            
        } catch (error) {
            console.error('Detailed sign out error:', error);
            toast.error('Failed to sign out. Please try again.');
            throw error;
        }
    };

    return ( 
        <>
            <Navbar 
                maxWidth="full" 
                className={`${process.env.NEXT_PUBLIC_NETWORK === 'mainnet' ? 'mb-8' : 'mb-4'}`}
                isMenuOpen={isMenuOpen}
                onMenuOpenChange={setIsMenuOpen}
            >
                <NavbarBrand>
                    <Link href="/" className="cursor-pointer">
                        <span className="box">
                            <h1 style={{fontSize: "2.5rem", color: "#0159E0", fontWeight:"bold"}} className={vt323.className}>
                                Lynxify
                            </h1>
                        </span>
                    </Link>
                </NavbarBrand>
                
                {/* Desktop Menu */}
                <NavbarContent className="hidden sm:flex gap-6" justify="center">
                    <NavbarItem>
                        <Link 
                            href="/dex" 
                            className={`text-white text-2xl hover:text-foreground transition-colors ${vt323.className}`}
                        >
                            Swap
                        </Link>
                    </NavbarItem>
                    <NavbarItem>
                        <Link 
                            href="/wallet" 
                            className={`text-white text-2xl hover:text-foreground transition-colors ${vt323.className}`}
                        >
                            Wallet
                        </Link>
                    </NavbarItem>
                </NavbarContent>

                <NavbarContent className="hidden sm:flex" justify="end">
                    <NavbarItem>
                        <Link 
                            href="/token" 
                            className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <Image 
                                src="/images/lxy.png"
                                alt="LXY Token"
                                width={24}
                                height={24}
                                className="rounded-full"
                            />
                            <span className="text-sm font-medium">LXY</span>
                        </Link>
                    </NavbarItem>

                    {(isConnected || isSignedIn) && (
                        <NavbarItem className="flex items-center">
                            <div className="px-3 py-1 bg-[#1a1a1a] rounded-lg border border-[#333] flex items-center">
                                <span className="text-[#0159E0] font-bold text-sm">
                                    {totalXP} XP
                                </span>
                            </div>
                        </NavbarItem>
                    )}

                    <NavbarItem className="flex gap-2">
                        {!isConnected && !isSignedIn ? (
                            <>
                                <Button 
                                    className="mt-0" 
                                    variant="bordered"
                                    size="sm"
                                    style={{
                                        backgroundColor: "#0159E0",
                                        color: "white",
                                        borderColor: "#0159E0"
                                    }}
                                    onPress={() => handleConnect()}
                                >
                                    Connect Wallet
                                </Button>
                                <Button
                                    className="mt-0"
                                    variant="bordered"
                                    size="sm"
                                    onPress={() => setShowConnectModal(true)}
                                >
                                    Create Wallet
                                </Button>
                                <Button
                                    className="mt-0"
                                    variant="light"
                                    size="sm"
                                    onPress={() => router.push('/auth/login')}
                                >
                                    Sign In
                                </Button>
                            </>
                        ) : (
                            <Dropdown>
                                <DropdownTrigger>
                                    <Button variant="light" size="sm" className="text-sm">
                                        {balance} ℏ
                                    </Button>
                                </DropdownTrigger>
                                <DropdownMenu aria-label="Account Actions">
                                    <DropdownItem 
                                        key="account" 
                                        className="text-sm cursor-pointer"
                                        onClick={() => handleCopyAccount(activeAccount!)}
                                    >
                                        {activeAccount}
                                    </DropdownItem>
                                    <DropdownItem 
                                        key="wallet"
                                        className="text-sm"
                                        onPress={() => router.push('/wallet')}
                                    >
                                        View Wallet
                                    </DropdownItem>
                                    <DropdownItem 
                                        key="logout" 
                                        className="text-danger" 
                                        color="danger" 
                                        onPress={handleSignOut}
                                    >
                                        Sign Out
                                    </DropdownItem>
                                </DropdownMenu>
                            </Dropdown>
                        )}
                    </NavbarItem>
                </NavbarContent>

                {/* Mobile Menu Button - Always visible on mobile */}
                <NavbarContent className="sm:hidden" justify="end">
                    {!isConnected ? (
                        <NavbarMenuToggle />
                    ) : (
                        <Button 
                            variant="light" 
                            size="sm"
                            className="text-sm"
                        >
                            {balance} ℏ
                        </Button>
                    )}
                </NavbarContent>

                {/* Mobile Menu */}
                <NavbarMenu>
                    <NavbarMenuItem>
                        <Link 
                            href="/dex" 
                            className={`w-full py-2 text-foreground-500 hover:text-foreground text-2xl ${vt323.className}`}
                        >
                            DEX
                        </Link>
                    </NavbarMenuItem>
                    <NavbarMenuItem className="mb-6">
                        <Link 
                            href="/wallet" 
                            className={`w-full py-2 text-foreground-500 hover:text-foreground text-2xl ${vt323.className}`}
                        >
                            Wallet
                        </Link>
                    </NavbarMenuItem>

                    {/* Updated mobile authentication section */}
                    {!isConnected && !isSignedIn ? (
                        <>
                            <NavbarMenuItem>
                                <Button 
                                    className="w-full" 
                                    variant="bordered"
                                    style={{
                                        backgroundColor: "#0159E0",
                                        color: "white",
                                        borderColor: "#0159E0"
                                    }}
                                    onPress={() => handleConnect()}
                                >
                                    Connect Wallet
                                </Button>
                            </NavbarMenuItem>
                            <NavbarMenuItem>
                                <Button
                                    className="w-full"
                                    variant="bordered"
                                    onPress={() => setShowConnectModal(true)}
                                >
                                    Create Wallet
                                </Button>
                            </NavbarMenuItem>
                            <NavbarMenuItem>
                                <Button
                                    className="w-full"
                                    variant="light"
                                    onPress={() => router.push('/auth/login')}
                                >
                                    Sign In
                                </Button>
                            </NavbarMenuItem>
                        </>
                    ) : (
                        <>
                            {/* Show when connected */}
                            <NavbarMenuItem className="mb-4">
                                <div className="px-3 py-2 bg-[#1a1a1a] rounded-lg border border-[#333] flex items-center justify-between w-full">
                                    <span className="text-[#0159E0] font-bold">
                                        {totalXP} XP
                                    </span>
                                </div>
                            </NavbarMenuItem>
                            
                            <NavbarMenuItem>
                                <div 
                                    className="w-full py-2 text-foreground-500 cursor-pointer"
                                    onClick={() => handleCopyAccount(activeAccount!)}
                                >
                                    Account: {activeAccount}
                                </div>
                            </NavbarMenuItem>
                            
                            <NavbarMenuItem>
                                <Button 
                                    color="danger" 
                                    variant="flat" 
                                    onPress={handleSignOut}
                                    className="w-full"
                                >
                                    Sign Out
                                </Button>
                            </NavbarMenuItem>
                        </>
                    )}

                    <NavbarMenuItem>
                        <Link 
                            href="/token" 
                            className="flex items-center gap-2 py-2 w-full"
                        >
                            <Image 
                                src="/images/lxy.png"
                                alt="LXY Token"
                                width={24}
                                height={24}
                                className="rounded-full"
                            />
                            <span>LXY Token</span>
                        </Link>
                    </NavbarMenuItem>
                </NavbarMenu>
            </Navbar>

            <Modal 
                isOpen={showPurchaseModal} 
                onClose={() => setShowPurchaseModal(false)}
                classNames={{
                    base: "max-w-md mx-auto bg-black border border-gray-800 rounded-lg",
                    header: vt323.className
                }}
                placement="center"
            >
                <ModalContent>
                    <ModalHeader className="text-2xl">Purchase Access NFT</ModalHeader>
                    <ModalBody>
                        <PurchaseNFT 
                            apiUrl="/api/nft"
                            tokenId={process.env.NEXT_PUBLIC_ACCESS_NFT_TOKEN_ID || ""}
                            client={extensionClient}
                        />
                    </ModalBody>
                </ModalContent>
            </Modal>

            <Modal 
                isOpen={showConnectModal} 
                onClose={() => setShowConnectModal(false)}
                placement="center"
                classNames={{
                    base: "bg-black border border-gray-800 rounded-lg",
                    header: "border-b border-gray-800",
                    body: "max-h-[400px] overflow-y-auto",
                    closeButton: "hover:bg-gray-800 active:bg-gray-700"
                }}
            >
                <ModalContent>
                    <ModalHeader className="text-xl font-bold">Create Wallet</ModalHeader>
                    <ModalBody className="pb-6">
                        <ConnectWallet />
                    </ModalBody>
                </ModalContent>
            </Modal>

            {error && (
                <div className="fixed top-4 right-4 z-50">
                    <div className="bg-red-900/50 border border-red-800 text-red-200 px-6 py-4 rounded-lg shadow-lg flex items-center justify-between gap-4" role="alert">
                        <div>
                            <strong className="font-bold">Error: </strong>
                            <span>{error}</span>
                        </div>
                        <button 
                            className="text-red-200 hover:text-red-100"
                            onClick={() => setError(null)}
                        >
                            <svg className="h-5 w-5" viewBox="0 0 20 20">
                                <path 
                                    fillRule="evenodd" 
                                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" 
                                    clipRule="evenodd"
                                />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default Header;