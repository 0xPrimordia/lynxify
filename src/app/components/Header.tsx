"use client";
import { VT323 } from "next/font/google";
import { Button, Navbar, NavbarContent, NavbarItem, NavbarBrand, Link, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, NavbarMenuToggle, NavbarMenu, NavbarMenuItem } from "@nextui-org/react";
import { useWalletContext } from "../hooks/useWallet";
import { useNFTGate } from "../hooks/useNFTGate";
import { useRewards } from "../hooks/useRewards";
import PurchaseNFT from "./purchaseNFT";
import { useState, useEffect } from "react";
import { AccountBalanceQuery } from "@hashgraph/sdk";
import { handleDisconnectSessions } from '@/utils/supabase/session';

const vt323 = VT323({ weight: "400", subsets: ["latin"] })

const Header = () => {
    const { handleConnect, dAppConnector, sessions, account, client, userId, handleDisconnect, error, setError, isConnecting } = useWalletContext();
    const { hasAccess, isLoading: nftLoading } = useNFTGate(account);
    const { fetchAchievements, totalXP } = useRewards();
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [balance, setBalance] = useState<string>("0");
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        if (account !== "") {
            setIsConnected(true);
            
            const fetchBalance = async () => {
                try {
                    const query = new AccountBalanceQuery()
                        .setAccountId(account)
                        .setMaxAttempts(3)
                        .setMaxBackoff(5000)
                        .setMinBackoff(250);

                    const accountBalance = await query.execute(client);
                    const hbarBalance = accountBalance.hbars.toString();
                    setBalance(parseFloat(hbarBalance).toFixed(2));
                    return true; // Successful fetch
                } catch (error: any) {
                    if (error.toString().includes('503')) {
                        // Silently ignore 503 errors and keep existing balance
                        return false;
                    }
                    console.error('Balance fetch error:', error);
                    if (balance === "0") {
                        setBalance("0");
                    }
                    return false;
                }
            };

            // Initial fetch
            fetchBalance();

            // Set up polling with less frequent updates
            const INITIAL_POLL_INTERVAL = 60000; // Start with 60s instead of 30s
            const MAX_POLL_INTERVAL = 300000;    // Max 5 minutes
            let pollInterval = INITIAL_POLL_INTERVAL;
            let timeoutId: NodeJS.Timeout;

            const pollWithBackoff = async () => {
                const success = await fetchBalance();
                
                // Adjust polling interval based on success
                if (success) {
                    pollInterval = INITIAL_POLL_INTERVAL; // Reset to normal interval on success
                } else {
                    // Increase interval more gradually
                    pollInterval = Math.min(pollInterval * 1.2, MAX_POLL_INTERVAL);
                }

                timeoutId = setTimeout(pollWithBackoff, pollInterval);
            };

            timeoutId = setTimeout(pollWithBackoff, pollInterval);

            return () => {
                clearTimeout(timeoutId);
            };
        } else {
            setIsConnected(false);
            setBalance("0");
        }
    }, [account, client]);

    useEffect(() => {
        if (userId && account) {
            fetchAchievements(userId, account);
        }
    }, [userId, account, fetchAchievements]);

    const handleAccessDenied = () => {
        setShowPurchaseModal(true);
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

                    {isConnected && (
                        <NavbarItem className="flex items-center">
                            <div className="px-3 py-1 bg-[#1a1a1a] rounded-lg border border-[#333] flex items-center">
                                <span className="text-[#0159E0] font-bold text-sm">
                                    {totalXP} XP
                                </span>
                            </div>
                        </NavbarItem>
                    )}

                    <NavbarItem>
                        {!isConnected ? (
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
                        ) : (
                            <Dropdown>
                                <DropdownTrigger>
                                    <Button variant="light" size="sm" className="text-sm">
                                        {balance} ℏ
                                    </Button>
                                </DropdownTrigger>
                                <DropdownMenu aria-label="Account Actions">
                                    <DropdownItem key="account" className="text-sm">
                                        {account}
                                    </DropdownItem>
                                    <DropdownItem 
                                        key="logout" 
                                        className="text-danger" 
                                        color="danger" 
                                        onPress={handleDisconnect}
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
                            onPress={() => handleConnect()}
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
                    base: "max-w-md mx-auto",
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