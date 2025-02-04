"use client";
import { VT323 } from "next/font/google";
import { Button, Navbar, NavbarContent, NavbarItem, NavbarBrand, Link, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, NavbarMenuToggle, NavbarMenu, NavbarMenuItem } from "@nextui-org/react";
import { useWalletContext } from "../hooks/useWallet";
import { useNFTGate } from "../hooks/useNFTGate";
import { useRewards } from "../hooks/useRewards";
import PurchaseNFT from "./purchaseNFT";
import { useState, useEffect } from "react";
import { AccountBalanceQuery, AccountId } from "@hashgraph/sdk";
import { handleDisconnectSessions } from '@/utils/supabase/session';
import { ConnectWallet } from './ConnectWallet';
import { useSupabase } from "../hooks/useSupabase";
import { useRouter } from "next/navigation";
import { toast } from 'sonner';

const vt323 = VT323({ weight: "400", subsets: ["latin"] })

const Header = () => {
    const { handleConnect, account, client, userId, handleDisconnect, error, setError, isConnecting, walletType } = useWalletContext();
    const { hasAccess, isLoading: nftLoading } = useNFTGate(account);
    const { fetchAchievements, totalXP } = useRewards();
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [balance, setBalance] = useState<string>("0");
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showConnectModal, setShowConnectModal] = useState(false);
    const { supabase } = useSupabase();
    const [isSignedIn, setIsSignedIn] = useState(false);
    const router = useRouter();
    const [userAccountId, setUserAccountId] = useState<string | null>(null);

    useEffect(() => {
        // Initial session check
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setIsSignedIn(!!session);
            if (session?.user) {
                // Fetch user's Hedera account ID
                const { data: userData } = await supabase
                    .from('Users')
                    .select('hederaAccountId')
                    .eq('id', session.user.id)
                    .single();
                
                if (userData?.hederaAccountId) {
                    setUserAccountId(userData.hederaAccountId);
                }
            }
        };
        checkSession();

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            setIsSignedIn(!!session);
            if (session?.user) {
                const { data: userData } = await supabase
                    .from('Users')
                    .select('hederaAccountId')
                    .eq('id', session.user.id)
                    .single();
                
                if (userData?.hederaAccountId) {
                    setUserAccountId(userData.hederaAccountId);
                }
            } else {
                setUserAccountId(null);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [supabase]);

    const activeAccount = account || userAccountId;
    const isConnected = Boolean(activeAccount);

    useEffect(() => {
        console.log('Header - Effect triggered with:', {
            isConnected,
            activeAccount,
            client,
            walletType
        });

        if (!isConnected) {
            console.log('Header - Not connected, skipping balance fetch');
            return;
        }

        const fetchBalance = async () => {
            try {
                if (!activeAccount) return;
                console.log('Header - Fetching balance for:', {
                    activeAccount,
                    walletType,
                    client: client?.ledgerId?.toString()
                });
                const query = new AccountBalanceQuery()
                    .setAccountId(AccountId.fromString(activeAccount));
                const balance = await query.execute(client);
                console.log('Header - Balance result:', {
                    raw: balance.hbars.toString(),
                    parsed: parseFloat(balance.hbars.toString())
                });
                const hbarBalance = parseFloat(balance.hbars.toString());
                setBalance(hbarBalance.toFixed(2));
            } catch (error) {
                console.error('Header - Failed to fetch balance:', error);
                setBalance('0.00');
            }
        };

        fetchBalance();
        const interval = setInterval(fetchBalance, 10000);
        return () => clearInterval(interval);
    }, [isConnected, activeAccount, client]);

    useEffect(() => {
        if (userId && account) {
            fetchAchievements(userId, account);
        }
    }, [userId, account, fetchAchievements]);

    const handleAccessDenied = () => {
        setShowPurchaseModal(true);
    };

    const handleCopyAccount = async (accountId: string) => {
        try {
            await navigator.clipboard.writeText(accountId);
            toast.success('Account ID copied to clipboard');
        } catch (err) {
            toast.error('Failed to copy account ID');
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
                <NavbarContent className="sm:hidden" justify="start">
                    <NavbarMenuToggle />
                </NavbarContent>

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
                            <img src="/images/lxy.png" alt="LXY Token" className="w-6 h-6" />
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
                                        onClick={() => handleCopyAccount(isConnected ? account : userAccountId!)}
                                    >
                                        {isConnected ? account : userAccountId!}
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
                                        onPress={async () => {
                                            if (isConnected) {
                                                await handleDisconnect();
                                            }
                                            if (isSignedIn) {
                                                await supabase.auth.signOut();
                                            }
                                        }}
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
                        <Button 
                            size="sm"
                            variant="bordered"
                            style={{
                                backgroundColor: "#0159E0",
                                color: "white",
                                borderColor: "#0159E0"
                            }}
                            onPress={() => setShowConnectModal(true)}
                        >
                            Connect
                        </Button>
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
                            className="w-full py-2 text-foreground-500 hover:text-foreground"
                        >
                            DEX
                        </Link>
                    </NavbarMenuItem>
                    <NavbarMenuItem>
                        <Link 
                            href="/wallet" 
                            className="w-full py-2 text-foreground-500 hover:text-foreground"
                        >
                            Wallet
                        </Link>
                    </NavbarMenuItem>
                    {isConnected && (
                        <NavbarMenuItem className="mb-4">
                            <div className="px-3 py-2 bg-[#1a1a1a] rounded-lg border border-[#333] flex items-center justify-between w-full">
                                <span className="text-[#0159E0] font-bold">
                                    {totalXP} XP
                                </span>
                            </div>
                        </NavbarMenuItem>
                    )}
                    
                    <NavbarMenuItem>
                        <Link 
                            href="/token" 
                            className="flex items-center gap-2 py-2 w-full"
                        >
                            <img src="/images/lxy.png" alt="LXY Token" className="w-6 h-6" />
                            <span>LXY Token</span>
                        </Link>
                    </NavbarMenuItem>

                    {isConnected && (
                        <>
                            <NavbarMenuItem className="py-2">
                                <div className="text-sm text-foreground-500">
                                    Account: {account}
                                </div>
                            </NavbarMenuItem>
                            <NavbarMenuItem>
                                <Button 
                                    color="danger" 
                                    variant="flat" 
                                    onPress={handleDisconnect}
                                    className="w-full"
                                >
                                    Sign Out
                                </Button>
                            </NavbarMenuItem>
                        </>
                    )}
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
                            client={client}
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
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                        <strong className="font-bold">Error: </strong>
                        <span className="block sm:inline">{error}</span>
                        <button 
                            className="absolute top-0 right-0 px-4 py-3"
                            onClick={() => setError(null)}
                        >
                            <span className="sr-only">Close</span>
                            <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
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